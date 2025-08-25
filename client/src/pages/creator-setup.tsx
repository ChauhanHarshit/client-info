import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { getApiUrl } from '@/lib/api-config';

const setupSchema = z.object({
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type SetupFormData = z.infer<typeof setupSchema>;

export default function CreatorSetup() {
  const [, setLocation] = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [setupToken, setSetupToken] = useState<string | null>(null);
  const [username, setUsername] = useState<string>('');
  const { toast } = useToast();

  const form = useForm<SetupFormData>({
    resolver: zodResolver(setupSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  useEffect(() => {
    // Extract token from URL
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    
    if (!token) {
      toast({
        title: "Invalid Setup Link",
        description: "The setup link is missing required information.",
        variant: "destructive",
      });
      return;
    }

    setSetupToken(token);
    
    // Verify token and get creator info
    verifySetupToken(token);
  }, []);

  const verifySetupToken = async (token: string) => {
    try {
      const response = await fetch(getApiUrl(`/api/creator-setup/verify?token=${token}`), {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Invalid or expired setup token');
      }

      const data = await response.json();
      setUsername(data.username);
    } catch (error) {
      toast({
        title: "Setup Link Error",
        description: "This setup link is invalid or has expired.",
        variant: "destructive",
      });
    }
  };

  const handleSetupSubmit = async (data: SetupFormData) => {
    if (!setupToken) {
      toast({
        title: "Error",
        description: "Setup token is missing.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(getApiUrl('/api/creator-setup/complete'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          token: setupToken,
          password: data.password,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to complete setup');
      }

      toast({
        title: "Account Setup Complete",
        description: "Your account has been set up successfully. Redirecting to login...",
      });

      // Redirect to creator login after successful setup
      setTimeout(() => {
        window.location.href = 'https://tastyyyy.com/creatorlogin';
      }, 2000);

    } catch (error) {
      toast({
        title: "Setup Failed",
        description: "There was an error setting up your account. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!setupToken) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-gray-900">Invalid Setup Link</CardTitle>
            <CardDescription>
              The setup link is missing or invalid. Please check your email for the correct link.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-gray-900">
            Welcome to Tasty Creator Platform
          </CardTitle>
          <CardDescription>
            Set up your password for username: <strong>{username}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSetupSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Enter your password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Confirm your password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full bg-pink-600 hover:bg-pink-700"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Setting up...' : 'Complete Setup'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}