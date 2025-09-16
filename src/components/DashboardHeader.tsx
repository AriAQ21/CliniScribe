import { Calendar } from "lucide-react";
import nhsLogo from "@/assets/nhs-logo.png";
import { useDummyUser } from "@/hooks/useDummyUser";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

export function DashboardHeader() {
  const { user, loading } = useDummyUser();
  const { logout } = useAuth();
  const today = new Date();
  const formattedDate = today.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="mb-8">
      {/* Top Header - NHS Logo and CliniScribe */}
      <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground p-6 rounded-t-lg shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <img src={nhsLogo} alt="NHS Logo" className="h-20 w-auto" />
            <div className="border-l border-primary-foreground/30 pl-6">
              <h1 className="text-4xl font-bold tracking-wide">CliniScribe</h1>
              <p className="text-primary-foreground/80 text-sm mt-1">Clinical Documentation System</p>
            </div>
          </div>
          <Button 
            variant="outline" 
            onClick={logout}
            className="bg-white/10 text-white border-white/20 hover:bg-white/20"
          >
            Logout
          </Button>
        </div>
      </div>
      
      {/* Dashboard Header - Date and Info */}
      <div className="bg-gradient-to-r from-primary/90 to-primary/70 text-primary-foreground p-4 rounded-b-lg shadow-lg border-t border-primary-foreground/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Calendar className="h-6 w-6" />
            <div>
              <h2 className="text-xl font-semibold">Dashboard</h2>
              <div className="flex items-center gap-3 text-primary-foreground/80 text-sm">
                <span>{loading ? 'Loading...' : user?.display_name || 'Dr. Sarah Williams'}</span>
                <div className="w-px h-4 bg-primary-foreground/40"></div>
                <span>{loading ? 'Loading...' : user?.location || 'Room 1'}</span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-primary-foreground/90 text-lg font-medium">{formattedDate}</p>
            <p className="text-primary-foreground/70 text-sm">Today's Schedule</p>
          </div>
        </div>
      </div>
    </div>
  );
}