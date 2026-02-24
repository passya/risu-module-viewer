import { decodeRPack } from './rpack/rpack_bg';
import * as fflate from 'fflate';
import { decode as decodeMsgpack } from 'msgpackr';

export async function decryptBuffer(data: Uint8Array, keys: string) {
    const keyArray = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(keys));

    const key = await crypto.subtle.importKey(
        "raw",
        keyArray,
        "AES-GCM",
        false,
        ["encrypt", "decrypt"]
    );

    const result = await crypto.subtle.decrypt(
        {
            name: "AES-GCM",
            iv: new Uint8Array(12),
        },
        key,
        data as BufferSource
    );

    return new Uint8Array(result);
}

export async function parseRisum(buffer: ArrayBuffer) {
    let buf = new Uint8Array(buffer);
    let pos = 0;

    const readLength = () => {
        const len = new DataView(buf.buffer, buf.byteOffset + pos).getUint32(0, true);
        pos += 4;
        return len;
    };
    
    const readByte = () => {
        const byte = buf[pos];
        pos += 1;
        return byte;
    };
    
    const readData = (len: number) => {
        const data = buf.subarray(pos, pos + len);
        pos += len;
        return data;
    };

    if (readByte() !== 111) {
        throw new Error("Invalid magic number for .risum file");
    }
    
    if (readByte() !== 0) {
        throw new Error("Invalid version for .risum file");
    }

    const mainLen = readLength();
    const mainData = readData(mainLen);
    const decodedMain = await decodeRPack(mainData);
    
    const mainStr = new TextDecoder().decode(decodedMain);
    const main = JSON.parse(mainStr);

    if (main.type !== 'risuModule') {
        throw new Error("Invalid module type embedded in file");
    }

    const module = main.module;

    let assetCount = 0;
    while (pos < buf.length) {
        const mark = readByte();
        if (mark === 0) {
            break;
        }
        if (mark !== 1) {
            break;
        }
        const len = readLength();
        readData(len); // Skip asset data for viewer
        assetCount++;
    }

    return { 
        module, 
        _meta: { 
            format: 'risum', 
            embeddedAssetsCount: assetCount 
        } 
    };
}

export async function parseRisup(buffer: ArrayBuffer) {
    let data: Uint8Array = new Uint8Array(buffer);
    
    data = (await decodeRPack(data)) as Uint8Array;
    const decompressed = fflate.decompressSync(data);
    const decoded = decodeMsgpack(decompressed);
    
    if ((decoded.presetVersion === 0 || decoded.presetVersion === 2) && decoded.type === 'preset') {
        const encryptedPreset = decoded.preset ?? decoded.pres;
        const decryptedBuf = await decryptBuffer(encryptedPreset, 'risupreset');
        const innerPreset = decodeMsgpack(decryptedBuf);
        
        return {
            _meta: {
                format: 'risup',
                presetVersion: decoded.presetVersion,
                wrapperType: decoded.type
            },
            preset: innerPreset
        };
    }
    
    return decoded;
}

export async function parseAnyFile(file: File) {
    const buffer = await file.arrayBuffer();
    if (file.name.endsWith('.risum')) {
        return parseRisum(buffer);
    } else if (file.name.endsWith('.risup') || file.name.endsWith('.risupreset')) {
        return parseRisup(buffer);
    } else if (file.name.endsWith('.json')) {
        return JSON.parse(new TextDecoder().decode(buffer));
    } else {
        throw new Error("Unsupported file extension. Only .risum, .risup, and .json are supported.");
    }
}
