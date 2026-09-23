import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Camera } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { getMyProfile, updateMyProfile } from "@/lib/atlas/api";
import { compressAvatar } from "@/lib/atlas/media";
import { isValidUsername, normalizeUsername } from "@/lib/atlas/usernames";

export const Route = createFileRoute("/app/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const queryClient = useQueryClient();
  const profile = useQuery({
    queryKey: ["me"],
    queryFn: () => getMyProfile(),
  });
  const fileRef = useRef<HTMLInputElement>(null);
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!profile.data) return;
    setDisplayName(profile.data.displayName);
    setUsername(profile.data.username);
    setBio(profile.data.bio);
    setPhotoUrl(profile.data.photoUrl);
  }, [profile.data]);

  const save = useMutation({
    mutationFn: () =>
      updateMyProfile({
        data: {
          displayName: displayName.trim(),
          username: normalizeUsername(username),
          bio,
          photoUrl,
        },
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(["me"], data);
      toast.success("Profil enregistré");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Enregistrement impossible");
    },
  });

  async function onAvatar(file: File | undefined) {
    if (!file) return;
    try {
      const next = await compressAvatar(file);
      setPhotoUrl(next);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Photo illisible");
    }
  }

  if (profile.isPending) {
    return (
      <div className="mx-auto max-w-lg space-y-4 px-4 py-8">
        <Skeleton className="size-20 rounded-full" />
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (profile.isError || !profile.data) {
    return (
      <p className="px-6 py-16 text-sm text-destructive">
        Impossible de charger le profil.
      </p>
    );
  }

  const usernameOk = isValidUsername(normalizeUsername(username));

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-8 pb-24 md:px-8">
      <h1 className="font-display text-2xl font-semibold tracking-[-0.03em]">
        Profil
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Votre identifiant est unique. Les autres vous trouvent grâce à lui.
      </p>

      <div className="mt-8 flex items-center gap-4">
        <button
          type="button"
          className="relative"
          onClick={() => fileRef.current?.click()}
          aria-label="Changer la photo"
        >
          <Avatar src={photoUrl} name={displayName || "A"} size="xl" />
          <span className="absolute right-0 bottom-0 grid size-8 place-items-center rounded-full bg-primary text-primary-foreground">
            <Camera className="size-4" />
          </span>
        </button>
        <div>
          <p className="font-medium">{displayName || "Sans nom"}</p>
          <p className="text-sm text-muted-foreground">@{username || "identifiant"}</p>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => void onAvatar(e.target.files?.[0])}
        />
      </div>

      <form
        className="mt-8 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!usernameOk) {
            toast.error("Identifiant invalide.");
            return;
          }
          save.mutate();
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="displayName">Nom</Label>
          <Input
            id="displayName"
            value={displayName}
            maxLength={48}
            onChange={(e) => setDisplayName(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="username">Identifiant</Label>
          <Input
            id="username"
            value={username}
            maxLength={24}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <p className="text-xs text-muted-foreground">
            3–24 caractères, commence par une lettre, minuscules, chiffres et _.
          </p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="bio">Bio</Label>
          <Textarea
            id="bio"
            value={bio}
            maxLength={280}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Quelques mots, si vous voulez."
          />
        </div>
        <Button type="submit" disabled={save.isPending || !usernameOk}>
          {save.isPending ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </form>
    </div>
  );
}
