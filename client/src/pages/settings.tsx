import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useTheme } from "@/contexts/ThemeContext";
import { useCrmAuth } from "@/contexts/CrmAuthContext";
import { Moon, Sun, User, Mail, Shield, Bell } from "lucide-react";

export default function Settings() {
  const { theme, toggleTheme } = useTheme();
  const { employee } = useCrmAuth();
  
  const [notifications, setNotifications] = useState({
    emailUpdates: true,
    pushNotifications: false,
    weeklyReports: true,
    systemAlerts: true
  });

  const [profile, setProfile] = useState({
    firstName: employee?.firstName || "",
    lastName: employee?.lastName || "",
    email: employee?.email || "",
    bio: ""
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        showBackButton={true}
        backTo="/dashboard"
      />

      <div className="px-6 pb-6 space-y-6">
        {/* Appearance Settings */}
        <Card className="bg-background border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {theme === 'dark' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
              Appearance
            </CardTitle>
            <CardDescription>
              Customize how the interface looks and feels
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base font-medium">Dark Mode</Label>
                <p className="text-sm text-muted-foreground">
                  Switch between light and dark themes
                </p>
              </div>
              <Switch
                checked={theme === 'dark'}
                onCheckedChange={toggleTheme}
                className="data-[state=checked]:bg-primary"
              />
            </div>
          </CardContent>
        </Card>

        {/* Profile Settings */}
        <Card className="bg-background border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile Information
            </CardTitle>
            <CardDescription>
              Update your personal information and preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={profile.firstName}
                  onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                  className="bg-background"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={profile.lastName}
                  onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                  className="bg-background"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                className="bg-background"
                disabled
              />
              <p className="text-xs text-muted-foreground">
                Contact your administrator to change your email address
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                placeholder="Tell us a little about yourself..."
                value={profile.bio}
                onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                className="bg-background min-h-[80px]"
              />
            </div>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card className="bg-background border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
            </CardTitle>
            <CardDescription>
              Choose how you want to be notified about updates
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base font-medium">Email Updates</Label>
                <p className="text-sm text-muted-foreground">
                  Receive email notifications for important updates
                </p>
              </div>
              <Switch
                checked={notifications.emailUpdates}
                onCheckedChange={(checked) => 
                  setNotifications({ ...notifications, emailUpdates: checked })
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base font-medium">Push Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Get instant notifications in your browser
                </p>
              </div>
              <Switch
                checked={notifications.pushNotifications}
                onCheckedChange={(checked) => 
                  setNotifications({ ...notifications, pushNotifications: checked })
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base font-medium">Weekly Reports</Label>
                <p className="text-sm text-muted-foreground">
                  Receive weekly summary reports via email
                </p>
              </div>
              <Switch
                checked={notifications.weeklyReports}
                onCheckedChange={(checked) => 
                  setNotifications({ ...notifications, weeklyReports: checked })
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base font-medium">System Alerts</Label>
                <p className="text-sm text-muted-foreground">
                  Get notified about system maintenance and updates
                </p>
              </div>
              <Switch
                checked={notifications.systemAlerts}
                onCheckedChange={(checked) => 
                  setNotifications({ ...notifications, systemAlerts: checked })
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card className="bg-background border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Security & Privacy
            </CardTitle>
            <CardDescription>
              Manage your account security and privacy settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Access Level</Label>
              <div className="flex items-center gap-2">
                <div className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
                  {employee?.accessLevel || 'Employee'}
                </div>
                {employee?.massAccess && (
                  <div className="px-3 py-1 bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 rounded-full text-sm font-medium">
                    Full CRM Access
                  </div>
                )}
              </div>
            </div>
            <div className="pt-4">
              <Button variant="outline" size="sm">
                Change Password
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Save Changes */}
        <div className="flex justify-end gap-3">
          <Button variant="outline">
            Cancel
          </Button>
          <Button>
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}