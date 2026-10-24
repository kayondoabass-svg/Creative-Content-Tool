import { useState } from "react";
import { Link } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Monitor, RefreshCw } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface DeviceSession {
  id: string;
  current: boolean | null;
  userAgent: string | null;
  createdAt: string | null;
  expiresAt: string | null;
}
interface Sessions {
  supported: boolean;
  message?: string;
  sessions: DeviceSession[];
}

async function deviceRequest<T>(method: string, path: string, body?: object): Promise<T> {
  const response = await fetch(path, {
    method, credentials: "include", cache: "no-store",
    ...(body ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {}),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Unable to manage devices. Please try again.");
  return data;
}

function displayDate(value: string | null) {
  if (!value) return "Not supplied by sign-in provider";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not supplied by sign-in provider" : date.toLocaleString();
}

export default function AccountSettings() {
  const { user, isLoading } = useAuth();
  const queryClient = useQueryClient();
  const [confirmation, setConfirmation] = useState<"all" | DeviceSession | null>(null);
  const [notice, setNotice] = useState("");
  const devices = useQuery<Sessions>({
    queryKey: ["/api/auth/sessions"],
    queryFn: () => deviceRequest("GET", "/api/auth/sessions"),
    enabled: !!user,
    retry: false,
    staleTime: 0,
    gcTime: 0,
  });
  const revoke = useMutation({
    mutationFn: (target: "all" | DeviceSession) => target === "all"
      ? deviceRequest<{ signedOut: boolean }>("POST", "/api/auth/logout-all", { confirm: true })
      : deviceRequest<{ signedOut: boolean }>("DELETE", `/api/auth/sessions/${encodeURIComponent(target.id)}`),
    onMutate: () => setNotice(""),
    onSuccess: async (result) => {
      if (result.signedOut) {
        queryClient.clear();
        window.location.assign("/login");
        return;
      }
      setNotice("Device signed out successfully.");
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/sessions"] });
    },
    onError: () => {
      // A request may have reached the provider before a network failure.
      void queryClient.invalidateQueries({ queryKey: ["/api/auth/sessions"] });
    },
  });

  if (isLoading) return <p className="p-6">Loading account settings…</p>;
  if (!user) return <div className="mx-auto max-w-3xl p-6"><h1 className="text-2xl font-bold">Account settings</h1><p className="mt-4">Please <Link className="text-primary underline" href="/login">sign in</Link> to manage your devices.</p></div>;

  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8">
      <h1 className="text-2xl font-bold">Account settings</h1>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Monitor className="h-5 w-5" />Active devices</CardTitle>
          <CardDescription>Review your Afro Auth sign-ins and sign out devices you no longer use. Your saved lessons and subscription will not be deleted.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button variant="outline" onClick={() => void devices.refetch()} disabled={devices.isFetching || revoke.isPending} data-testid="refresh-devices">
            <RefreshCw className="mr-2 h-4 w-4" />Refresh devices
          </Button>
          {devices.isPending && <p role="status">Loading active devices…</p>}
          {devices.isError && <p role="alert" className="text-destructive">{devices.error.message}</p>}
          {notice && <p role="status">{notice}</p>}
          {revoke.isError && <p role="alert" className="text-destructive">{revoke.error.message}</p>}
          {devices.data && !devices.isError && !devices.data.supported && <p data-testid="unsupported-devices">{devices.data.message}</p>}
          {devices.data?.supported && !devices.isError && <>
            <p className="text-sm text-muted-foreground">This list covers Afro Auth sessions only. Separate Google or older local sign-ins are not included or signed out. Device details may be unavailable; if the provider cannot identify this device, signing out a listed session may also sign you out here.</p>
            {devices.data.sessions.length === 0 && <p>No active sessions were returned. Refresh to check again.</p>}
            <ul className="space-y-3" aria-label="Active sessions">
              {devices.data.sessions.map((device, index) => (
                <li key={device.id} className="rounded-lg border p-4" data-testid="device-session">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1 space-y-1 text-sm">
                      <p className="font-medium">Session {index + 1}{device.current === true ? " · This device" : ""}</p>
                      <p className="break-words text-muted-foreground">{device.userAgent || "Device details not supplied by sign-in provider"}</p>
                      <p>Signed in: {displayDate(device.createdAt)}</p>
                      <p>Expires: {displayDate(device.expiresAt)}</p>
                    </div>
                    <Button variant="outline" disabled={revoke.isPending || devices.isFetching || device.current === true} onClick={() => { revoke.reset(); setConfirmation(device); }}>
                      {device.current === true ? "Current device" : "Sign out device"}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
            <div className="border-t pt-4">
              <Button variant="destructive" disabled={revoke.isPending || devices.isFetching} onClick={() => { revoke.reset(); setConfirmation("all"); }} data-testid="sign-out-everywhere">Sign out everywhere</Button>
              <p className="mt-2 text-sm text-muted-foreground">Includes this browser and all other Afro Auth devices. You will need to sign in again.</p>
            </div>
          </>}
        </CardContent>
      </Card>
      <AlertDialog open={confirmation !== null} onOpenChange={(open) => { if (!open) setConfirmation(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmation === "all" ? "Sign out everywhere?" : "Sign out this device?"}</AlertDialogTitle>
            <AlertDialogDescription>{confirmation === "all"
              ? "All of your Afro Auth sessions, including this browser, will be revoked. Separate Google and older local sign-ins are not affected. Save any unfinished work first."
              : "This session will lose access to BrightBoard. If the provider has not identified the current device, it may be this browser. Save any unfinished work first."}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (confirmation) revoke.mutate(confirmation); }} data-testid="confirm-device-signout">Confirm sign out</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
