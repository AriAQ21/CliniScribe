import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useTranscription } from "@/hooks/useTranscription";
import { useAppointmentDetails } from "@/hooks/useAppointmentDetails";
import { useAuth } from "@/hooks/useAuth";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useMicrophoneSelection } from "@/hooks/useMicrophoneSelection";
import { MicrophoneSelector } from "@/components/MicrophoneSelector";
import { 
  ArrowLeft, 
  User, 
  Calendar, 
  Hash, 
  Mic, 
  MicOff, 
  Send,
  FileText,
  Edit3,
  Save,
  X,
  Upload,
  CheckCircle,
  Tag,
  Plus
} from "lucide-react";

const AppointmentDetail = () => {
  console.log('🧪 AppointmentDetail component starting to render');
  
  const { id } = useParams();
  const navigate = useNavigate();
  
  console.log('🧪 AppointmentDetail: Calling useAuth hook');
  const { user } = useAuth();
  console.log('🧪 AppointmentDetail: useAuth returned:', { user });

  const [consentGiven, setConsentGiven] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileUploaded, setFileUploaded] = useState(false);

  // Manual tags state
  const [manualTagsDialogOpen, setManualTagsDialogOpen] = useState(false);
  const [manualTags, setManualTags] = useState<Array<{label: string; content: string}>>([]);
  const [currentTagLabel, setCurrentTagLabel] = useState("");
  const [currentTagContent, setCurrentTagContent] = useState("");

  console.log('🧪 AppointmentDetail: Getting appointment details for id:', id);
  const { appointment, patientData, loading, error } = useAppointmentDetails(id || "");
  console.log('🧪 AppointmentDetail: useAppointmentDetails returned:', { appointment, patientData, loading, error });

  // Microphone selection
  const {
    availableDevices,
    selectedDevice,
    hasMultipleDevices,
    isLoadingDevices,
    selectDevice,
    getConstraintsForSelectedDevice,
  } = useMicrophoneSelection();

  // Create appointment date for today at the specified time - memoized to prevent infinite loops
  const appointmentDate = useMemo(() => {
    const date = new Date();
    if (patientData?.time) {
      const timeMatch = patientData.time.match(/(\d+):(\d+)\s*(AM|PM)/);
      if (timeMatch) {
        let hours = parseInt(timeMatch[1]);
        const minutes = parseInt(timeMatch[2]);
        const isPM = timeMatch[3] === "PM";
        if (isPM && hours !== 12) hours += 12;
        if (!isPM && hours === 12) hours = 0;
        date.setHours(hours, minutes, 0, 0);
      }
    }
    return date;
  }, [patientData?.time]);

  const {
    recordingState,
    hasRecorded,
    recordingDuration,
    transcriptionText,
    transcriptionSent,
    isEditingTranscription,
    isProcessing,
    isLoadingExistingTranscription,
    permissionGranted,
    setTranscriptionText,
    handleStartRecording,
    handlePauseRecording,
    handleResumeRecording,
    handleSendForTranscription,
    handleUploadFileForTranscription,
    handleEditTranscription,
    handleSaveTranscription,
    handleCancelEdit,
  } = useTranscription(id, appointmentDate, manualTags, getConstraintsForSelectedDevice());

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card>
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading appointment details...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !appointment || !patientData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card>
          <CardContent className="p-8 text-center">
            <h2 className="text-2xl font-semibold mb-4">Appointment Not Found</h2>
            <p className="text-muted-foreground mb-4">{error || "The requested appointment could not be found."}</p>
            <Button onClick={() => navigate("/")}>Return to Dashboard</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const room = appointment.room;

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith("audio/")) {
      setSelectedFile(file);
      setFileUploaded(true);
    }
  };

  const resetUploadDialog = () => {
    setSelectedFile(null);
    setFileUploaded(false);
  };

  const addManualTag = () => {
    if (currentTagLabel.trim() && currentTagContent.trim()) {
      setManualTags(prev => [...prev, { 
        label: currentTagLabel.trim(), 
        content: currentTagContent.trim() 
      }]);
      setCurrentTagLabel("");
      setCurrentTagContent("");
    }
  };

  const removeManualTag = (index: number) => {
    setManualTags(prev => prev.filter((_, i) => i !== index));
  };

  const resetManualTagsDialog = () => {
    setCurrentTagLabel("");
    setCurrentTagContent("");
  };

  console.log('🧪 AppointmentDetail: About to render main component');
  
  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" onClick={() => navigate("/")} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>

        {/* Patient Info */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <User className="h-6 w-6 text-primary" />
              Appointment Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Patient Name</p>
                  <p className="font-semibold text-lg">{patientData.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Date of Birth</p>
                  <p className="font-semibold text-lg">{patientData.dateOfBirth}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Hash className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">NHS Number</p>
                  <p className="font-semibold text-lg">{patientData.nhsNumber}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Hide controls once transcription has started or finished */}
        {!(transcriptionSent || isProcessing) && (
          <>
            {/* Upload Audio */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Audio Upload</CardTitle>
              </CardHeader>
              <CardContent>
                <Dialog
                  open={uploadDialogOpen}
                  onOpenChange={(open) => {
                    setUploadDialogOpen(open);
                    if (!open) resetUploadDialog();
                  }}
                >
                  <DialogTrigger asChild>
                    <Button variant="outline" size="lg" className="gap-2">
                      <Upload className="h-5 w-5" />
                      Upload Audio
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Upload Audio File</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      {!fileUploaded ? (
                        <>
                          <p className="text-sm text-muted-foreground">
                            Select an audio file from your computer to upload for transcription.
                          </p>
                          <Input type="file" accept="audio/*" onChange={handleFileSelect} />
                        </>
                      ) : (
                        <>
                          <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-lg">
                            <CheckCircle className="h-5 w-5 text-green-600" />
                            <div>
                              <p className="font-medium">File selected</p>
                              <p className="text-sm text-muted-foreground">{selectedFile?.name}</p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              onClick={() => {
                                if (selectedFile && id) {
                                  handleUploadFileForTranscription(selectedFile, id, room, appointmentDate);
                                  setUploadDialogOpen(false);
                                  setSelectedFile(null);
                                  setFileUploaded(false);
                                }
                              }}
                              className="flex-1 gap-2"
                            >
                              <Send className="h-4 w-4" />
                              Send for Transcription
                            </Button>
                            <Button onClick={resetUploadDialog} variant="outline">
                              Choose Different File
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>

            {/* Recording */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Recording Controls</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="consent"
                    checked={consentGiven}
                    onCheckedChange={(checked) => setConsentGiven(checked as boolean)}
                  />
                  <label htmlFor="consent" className="text-lg font-medium">
                    Patient has given consent for recording
                  </label>
                </div>

                <Separator />

                <MicrophoneSelector
                  availableDevices={availableDevices}
                  selectedDevice={selectedDevice}
                  hasMultipleDevices={hasMultipleDevices}
                  isLoadingDevices={isLoadingDevices}
                  onSelectDevice={selectDevice}
                />

                {recordingState === "recording" && (
                  <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                      <span className="text-red-700 dark:text-red-300 font-medium">
                        Recording in progress - {Math.floor(recordingDuration / 60)}:
                        {(recordingDuration % 60).toString().padStart(2, "0")}
                      </span>
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-4">
                  {recordingState === "idle" && (
                    <Button
                      onClick={handleStartRecording}
                      disabled={!consentGiven}
                      size="lg"
                      className="gap-2 bg-accent hover:bg-accent/90"
                    >
                      <Mic className="h-5 w-5" />
                      Start Recording
                    </Button>
                  )}
                  {recordingState === "paused" && (
                    <>
                      <Button
                        onClick={handleResumeRecording}
                        disabled={!consentGiven}
                        size="lg"
                        className="gap-2 bg-accent hover:bg-accent/90"
                      >
                        <Mic className="h-5 w-5" />
                        Resume Recording
                      </Button>
                      
                      <Dialog 
                        open={manualTagsDialogOpen} 
                        onOpenChange={(open) => {
                          setManualTagsDialogOpen(open);
                          if (!open) resetManualTagsDialog();
                        }}
                      >
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="lg"
                            className="gap-2"
                          >
                            <Tag className="h-5 w-5" />
                            Add Manual Tag
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                          <DialogHeader>
                            <DialogTitle>Add Manual Tags</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Define Tag</label>
                              <Input
                                placeholder="e.g., Symptom, Medication, Note"
                                value={currentTagLabel}
                                onChange={(e) => setCurrentTagLabel(e.target.value)}
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Tag Content</label>
                              <Input
                                placeholder="Enter tag content"
                                value={currentTagContent}
                                onChange={(e) => setCurrentTagContent(e.target.value)}
                              />
                            </div>
                            <Button 
                              onClick={addManualTag}
                              disabled={!currentTagLabel.trim() || !currentTagContent.trim()}
                              className="w-full gap-2"
                            >
                              <Plus className="h-4 w-4" />
                              Add Tag
                            </Button>
                            
                            {manualTags.length > 0 && (
                              <div className="space-y-3">
                                <Separator />
                                <div className="space-y-2">
                                  <label className="text-sm font-medium">Added Tags</label>
                                  <div className="space-y-2">
                                    {manualTags.map((tag, index) => (
                                      <div key={index} className="flex items-center justify-between p-2 bg-muted/50 rounded-md">
                                        <div className="flex items-center gap-2 flex-1">
                                          <Badge variant="secondary" className="text-xs">
                                            {tag.label}
                                          </Badge>
                                          <span className="text-sm">{tag.content}</span>
                                        </div>
                                        <Button
                                          onClick={() => removeManualTag(index)}
                                          variant="ghost"
                                          size="sm"
                                          className="h-6 w-6 p-0 hover:bg-destructive hover:text-destructive-foreground"
                                        >
                                          <X className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </DialogContent>
                      </Dialog>
                      
                      <Button
                        onClick={() => handleSendForTranscription(id!, room, appointmentDate)}
                        disabled={transcriptionSent}
                        size="lg"
                        className="gap-2"
                      >
                        <Send className="h-5 w-5" />
                        {transcriptionSent ? "Transcription Sent" : "Send for Transcription"}
                      </Button>
                    </>
                  )}
                  {recordingState === "recording" && (
                    <Button onClick={handlePauseRecording} size="lg" variant="secondary" className="gap-2">
                      <MicOff className="h-5 w-5" />
                      Pause Recording
                    </Button>
                  )}
                  {hasRecorded && recordingState === "idle" && !transcriptionSent && (
                    <Button onClick={() => handleSendForTranscription(id!, room, appointmentDate)} size="lg" className="gap-2">
                      <Send className="h-5 w-5" />
                      Send for Transcription
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Transcription Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Transcription
              </CardTitle>
              {transcriptionText && !isEditingTranscription && (
                <Button onClick={handleEditTranscription} variant="outline" size="sm" className="gap-2">
                  <Edit3 className="h-4 w-4" />
                  Edit Transcription
                </Button>
              )}
              {isEditingTranscription && (
                <div className="flex gap-2">
                  <Button onClick={handleSaveTranscription} size="sm" className="gap-2">
                    <Save className="h-4 w-4" />
                    Save
                  </Button>
                  <Button onClick={handleCancelEdit} variant="outline" size="sm" className="gap-2">
                    <X className="h-4 w-4" />
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isProcessing ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
                <p className="text-muted-foreground">Transcription in progress...</p>
              </div>
            ) : isLoadingExistingTranscription ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
                <p className="text-muted-foreground">Loading existing transcription...</p>
              </div>
            ) : transcriptionText ? (
              <div className="space-y-4">
                {isEditingTranscription ? (
                  <Textarea
                    value={transcriptionText}
                    onChange={(e) => setTranscriptionText(e.target.value)}
                    className="min-h-[300px] max-h-[500px] resize-none"
                  />
                ) : (
                  <div className="border rounded-lg p-4 bg-muted/30 max-h-[500px] overflow-y-auto">
                    <p className="text-foreground leading-relaxed whitespace-pre-wrap">
                      {transcriptionText}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Transcription will appear here after recording is sent for processing
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
    </ErrorBoundary>
  );
};

export default AppointmentDetail;
