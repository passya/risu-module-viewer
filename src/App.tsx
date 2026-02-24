import { useState, useCallback } from 'react';
import { UploadCloud, FileJson, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import JsonView from '@uiw/react-json-view';
import { vscodeTheme } from '@uiw/react-json-view/vscode';
import { parseAnyFile } from '@/lib/parser';

function App() {
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const processFile = async (file: File) => {
    setIsLoading(true);
    setError(null);
    setFileName(file.name);
    setParsedData(null);

    try {
      const result = await parseAnyFile(file);
      setParsedData(result);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to parse the file.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      processFile(file);
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
    // reset input so the same file can be selected again
    e.target.value = '';
  };

  const reset = () => {
    setFileName(null);
    setParsedData(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-neutral-950 p-6 md:p-12 text-slate-100 font-sans">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-extrabold tracking-tight text-white flex items-center justify-center gap-3">
            <FileJson className="w-10 h-10 text-emerald-500" />
            Risu Module Viewer
          </h1>
          <p className="text-slate-400 text-lg">
            Inspect \`.risum\` modules and \`.risup\` plugins easily.
          </p>
        </div>

        {!parsedData && (
          <Card className="border-dashed border-2 bg-neutral-900 border-neutral-700 shadow-xl overflow-hidden transition-all duration-300">
            <CardContent className="p-0">
              <label
                className={`flex flex-col items-center justify-center min-h-[400px] cursor-pointer transition-colors ${
                  isDragging ? 'bg-neutral-800' : 'hover:bg-neutral-800/50'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <div className="flex flex-col items-center justify-center space-y-4 p-12 text-center">
                  <div className="p-4 bg-neutral-800 rounded-full shadow-inner ring-1 ring-neutral-700">
                    <UploadCloud className="w-12 h-12 text-emerald-400" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-xl font-bold text-slate-200">
                      Drag & Drop your file here
                    </h3>
                    <p className="text-sm text-slate-400">
                      Supports .risum, .risup, .risupreset, .json
                    </p>
                  </div>
                  <Button variant="secondary" className="mt-4 pointer-events-none">
                    Browse Files
                  </Button>
                </div>
                <input
                  type="file"
                  className="hidden"
                  accept=".risum,.risup,.risupreset,.json"
                  onChange={handleFileChange}
                />
              </label>
            </CardContent>
          </Card>
        )}

        {isLoading && (
          <div className="text-center p-12 animate-pulse text-emerald-500 font-medium">
            Parsing {fileName}...
          </div>
        )}

        {error && (
          <Alert variant="destructive" className="bg-red-950/50 border-red-900 text-red-200">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error parsing {fileName}</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {parsedData && !isLoading && (
          <Card className="bg-neutral-900 border-neutral-800 shadow-2xl flex flex-col max-h-[85vh]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b border-neutral-800">
              <div className="space-y-1">
                <CardTitle className="text-xl text-emerald-400 flex items-center gap-2">
                  <FileJson className="w-5 h-5" />
                  {fileName}
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Successfully parsed and extracted data
                </CardDescription>
              </div>
              <Button onClick={reset} variant="outline" className="border-neutral-700 hover:bg-neutral-800">
                Close Viewer
              </Button>
            </CardHeader>
            <CardContent className="p-0 overflow-hidden flex-grow flex">
              <ScrollArea className="flex-1 w-full bg-[#1e1e1e] p-4 text-sm font-mono overflow-auto" style={{ maxHeight: 'calc(85vh - 85px)' }}>
                <JsonView
                  value={parsedData}
                  style={{...vscodeTheme, backgroundColor: 'transparent' }}
                  displayDataTypes={false}
                  displayObjectSize={true}
                  collapsed={false}
                  shortenTextAfterLength={100}
                />
              </ScrollArea>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export default App;
