import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Mic, ChevronDown } from "lucide-react";
import { MicrophoneDevice } from "@/hooks/useMicrophoneSelection";

interface MicrophoneSelectorProps {
  availableDevices: MicrophoneDevice[];
  selectedDevice: MicrophoneDevice | null;
  hasMultipleDevices: boolean;
  isLoadingDevices: boolean;
  onSelectDevice: (device: MicrophoneDevice) => void;
}

export function MicrophoneSelector({
  availableDevices,
  selectedDevice,
  hasMultipleDevices,
  isLoadingDevices,
  onSelectDevice,
}: MicrophoneSelectorProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  if (isLoadingDevices) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Mic className="h-4 w-4" />
        <span>Loading microphones...</span>
      </div>
    );
  }

  if (!hasMultipleDevices && selectedDevice) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>🎤</span>
        <span>Using: {selectedDevice.label}</span>
      </div>
    );
  }

  if (!hasMultipleDevices) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2">
      <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="justify-start">
            <Mic className="h-4 w-4 mr-2" />
            Change Microphone
            <ChevronDown className="h-4 w-4 ml-auto" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64 bg-background border border-border">
          {availableDevices.map((device) => (
            <DropdownMenuItem
              key={device.deviceId}
              onClick={() => {
                onSelectDevice(device);
                setDropdownOpen(false);
              }}
              className="cursor-pointer hover:bg-accent"
            >
              <Mic className="h-4 w-4 mr-2" />
              <span className="truncate">{device.label}</span>
              {selectedDevice?.deviceId === device.deviceId && (
                <span className="ml-auto text-primary">✓</span>
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      
      {selectedDevice && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>🎤</span>
          <span>Using: {selectedDevice.label}</span>
        </div>
      )}
    </div>
  );
}