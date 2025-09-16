import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, Database, FileText } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useDropzone } from 'react-dropzone';
import { useToast } from '@/hooks/use-toast';

const DataSourceSelection = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);

  const handleDemoData = () => {
    // Use demo user_id (1) which has existing appointments
    localStorage.setItem('data_source', 'demo');
    localStorage.setItem('demo_user_id', '1');
    navigate('/');
  };

  const handleImportData = () => {
    setShowUpload(true);
  };

  const onDrop = async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('user_id', user?.user_id.toString() || '');

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/appointments/bulk-upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Upload failed');
      }

      const result = await response.json();
      
      toast({
        title: "Import Successful",
        description: `${result.imported_count} appointments imported successfully.`,
      });

      localStorage.setItem('data_source', 'imported');
      navigate('/');
    } catch (error) {
      toast({
        title: "Import Failed",
        description: error instanceof Error ? error.message : 'Failed to import appointments',
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
    maxFiles: 1,
    disabled: isUploading
  });

  if (showUpload) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-2xl">
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Import Your Appointments</CardTitle>
              <CardDescription>
                Upload a CSV or Excel file with your appointment data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  isDragActive 
                    ? 'border-primary bg-primary/5' 
                    : 'border-muted-foreground/25 hover:border-primary/50'
                } ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <input {...getInputProps()} />
                <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                {isDragActive ? (
                  <p className="text-lg">Drop the file here...</p>
                ) : (
                  <div>
                    <p className="text-lg mb-2">
                      {isUploading ? 'Uploading...' : 'Drag & drop your file here, or click to browse'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Supports CSV, XLS, and XLSX files
                    </p>
                  </div>
                )}
              </div>

              <div className="bg-muted p-4 rounded-lg">
                <h4 className="font-medium mb-2">Required columns:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• patient_name</li>
                  <li>• doctor_name</li>
                  <li>• appointment_date (YYYY-MM-DD)</li>
                  <li>• appointment_time (HH:MM)</li>
                  <li>• room</li>
                </ul>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowUpload(false)}
                  className="flex-1"
                  disabled={isUploading}
                >
                  Back
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    const csvContent = `patient_name,doctor_name,appointment_date,appointment_time,room
John Smith,Dr. Johnson,2024-01-15,09:30,Room 101
Jane Doe,Dr. Smith,2024-01-15,10:00,Room 102`;
                    const blob = new Blob([csvContent], { type: 'text/csv' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'appointments_template.csv';
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="flex-1"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Download Template
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Welcome to CliniScribe</h1>
          <p className="text-muted-foreground text-lg">
            Choose how you'd like to get started with your appointments
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={handleDemoData}>
            <CardHeader className="text-center">
              <Database className="mx-auto h-12 w-12 text-primary mb-4" />
              <CardTitle className="text-xl">Try Demo Data</CardTitle>
              <CardDescription className="text-base">
                Explore CliniScribe with pre-loaded sample appointments to see all features in action
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" size="lg">
                Load Demo Data
              </Button>
              <p className="text-sm text-muted-foreground text-center mt-3">
                Perfect for testing and exploring features
              </p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={handleImportData}>
            <CardHeader className="text-center">
              <Upload className="mx-auto h-12 w-12 text-primary mb-4" />
              <CardTitle className="text-xl">Import My Appointments</CardTitle>
              <CardDescription className="text-base">
                Upload your own appointment data from a CSV or Excel file to get started immediately
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" variant="outline" size="lg">
                Import Appointments
              </Button>
              <p className="text-sm text-muted-foreground text-center mt-3">
                Supports CSV, XLS, and XLSX formats
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DataSourceSelection;