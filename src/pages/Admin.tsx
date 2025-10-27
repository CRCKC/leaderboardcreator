import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, LogOut, Trash2, Edit, Home } from "lucide-react";
import type { Session } from "@supabase/supabase-js";

interface Leaderboard {
  id: string;
  name: string;
  description: string | null;
}

interface Entry {
  id: string;
  player_name: string;
  score: number;
  rank: number | null;
  leaderboard_id: string;
}

const Admin = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [leaderboards, setLeaderboards] = useState<Leaderboard[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [selectedLeaderboard, setSelectedLeaderboard] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Form states
  const [newLeaderboardName, setNewLeaderboardName] = useState("");
  const [newLeaderboardDesc, setNewLeaderboardDesc] = useState("");
  const [newPlayerName, setNewPlayerName] = useState("");
  const [newScore, setNewScore] = useState("");

  const [leaderboardDialogOpen, setLeaderboardDialogOpen] = useState(false);
  const [editLeaderboardDialogOpen, setEditLeaderboardDialogOpen] = useState(false);
  const [entryDialogOpen, setEntryDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
  const [editingLeaderboard, setEditingLeaderboard] = useState<Leaderboard | null>(null);
  const [editLeaderboardName, setEditLeaderboardName] = useState("");
  const [editLeaderboardDesc, setEditLeaderboardDesc] = useState("");
  const [editPlayerName, setEditPlayerName] = useState("");
  const [editScore, setEditScore] = useState("");
  const [pointsToAdd, setPointsToAdd] = useState("");
  const addPointsRef = useRef<HTMLInputElement | null>(null);
  const [addPointsDialogOpen, setAddPointsDialogOpen] = useState(false);
  const [addPointsEntry, setAddPointsEntry] = useState<Entry | null>(null);
  const [addPointsOnlyValue, setAddPointsOnlyValue] = useState("");
  const addPointsOnlyRef = useRef<HTMLInputElement | null>(null);

  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);

      if (!session) {
        navigate("/auth");
        return;
      }

      // Check if user is admin
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .eq("role", "admin")
        .maybeSingle();

      if (!roleData) {
        toast.error("Access denied. Admin role required.");
        navigate("/");
        return;
      }

      setIsAdmin(true);
      setLoading(false);
      fetchLeaderboards();
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchLeaderboards = async () => {
    const { data, error } = await supabase
      .from("leaderboards")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to fetch leaderboards");
      return;
    }

    setLeaderboards(data || []);
  };

  const handleOpenEditLeaderboard = (lb: Leaderboard) => {
    setEditingLeaderboard(lb);
    setEditLeaderboardName(lb.name);
    setEditLeaderboardDesc(lb.description || "");
    setEditLeaderboardDialogOpen(true);
  };

  const handleUpdateLeaderboard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLeaderboard) return;

    if (!editLeaderboardName.trim()) {
      toast.error("Please enter a leaderboard name");
      return;
    }

    const { error } = await supabase
      .from("leaderboards")
      .update({ name: editLeaderboardName, description: editLeaderboardDesc || null })
      .eq("id", editingLeaderboard.id);

    if (error) {
      if (import.meta.env.DEV) console.error("Leaderboard update error:", error);
      toast.error(`Failed to update leaderboard: ${error.message}`);
      return;
    }

    toast.success("Leaderboard updated!");
    setEditLeaderboardDialogOpen(false);
    setEditingLeaderboard(null);
    fetchLeaderboards();
  };

  const fetchEntries = async (leaderboardId: string) => {
    const { data, error } = await supabase
      .from("entries")
      .select("*")
      .eq("leaderboard_id", leaderboardId)
      .order("rank", { ascending: true });

    if (error) {
      toast.error("Failed to fetch entries");
      return;
    }

    setEntries(data || []);
  };

  const handleCreateLeaderboard = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newLeaderboardName.trim()) {
      toast.error("Please enter a leaderboard name");
      return;
    }

    const { error } = await supabase
      .from("leaderboards")
      .insert({ name: newLeaderboardName, description: newLeaderboardDesc || null });

    if (error) {
      toast.error("Failed to create leaderboard");
      return;
    }

    toast.success("Leaderboard created!");
    setNewLeaderboardName("");
    setNewLeaderboardDesc("");
    setLeaderboardDialogOpen(false);
    fetchLeaderboards();
  };

  const handleCreateEntry = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedLeaderboard) {
      toast.error("Please select a leaderboard");
      return;
    }

    if (!newPlayerName.trim() || !newScore) {
      toast.error("Please enter player name and score");
      return;
    }

    const { error } = await supabase
      .from("entries")
      .insert({
        leaderboard_id: selectedLeaderboard,
        player_name: newPlayerName,
        score: parseInt(newScore),
      });

    if (error) {
      if (import.meta.env.DEV) {
        console.error("Entry creation error:", error);
      }
      toast.error(`Failed to add entry: ${error.message}`);
      return;
    }

    toast.success("Entry added!");
    setNewPlayerName("");
    setNewScore("");
    setEntryDialogOpen(false);
    fetchEntries(selectedLeaderboard);
  };

  const handleDeleteLeaderboard = async (id: string) => {
    if (!confirm("Are you sure you want to delete this leaderboard?")) return;

    const { error } = await supabase
      .from("leaderboards")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Failed to delete leaderboard");
      return;
    }

    toast.success("Leaderboard deleted");
    if (selectedLeaderboard === id) {
      setSelectedLeaderboard(null);
      setEntries([]);
    }
    fetchLeaderboards();
  };

  const handleDeleteEntry = async (id: string) => {
    if (!confirm("Are you sure you want to delete this entry?")) return;

    const { error } = await supabase
      .from("entries")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Failed to delete entry");
      return;
    }

    toast.success("Entry deleted");
    if (selectedLeaderboard) {
      fetchEntries(selectedLeaderboard);
    }
  };

  const handleEditEntry = (entry: Entry) => {
    setEditingEntry(entry);
    setEditPlayerName(entry.player_name);
    setEditScore(entry.score.toString());
    setPointsToAdd("");
    setEditDialogOpen(true);
  };

  // Focus the "Add Points" input whenever the edit dialog opens.
  useEffect(() => {
    if (editDialogOpen) {
      // Wait a tick for the dialog content to mount.
      const t = setTimeout(() => {
        addPointsRef.current?.focus();
      }, 0);
      return () => clearTimeout(t);
    }
  }, [editDialogOpen]);

  // Focus the input in the "add points only" dialog when it opens
  useEffect(() => {
    if (addPointsDialogOpen) {
      const t = setTimeout(() => {
        addPointsOnlyRef.current?.focus();
      }, 0);
      return () => clearTimeout(t);
    }
  }, [addPointsDialogOpen]);

  const handleUpdateEntry = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingEntry) return;

    const newScore = pointsToAdd
      ? editingEntry.score + parseInt(pointsToAdd)
      : parseInt(editScore);

    const { error } = await supabase
      .from("entries")
      .update({
        player_name: editPlayerName,
        score: newScore,
      })
      .eq("id", editingEntry.id);

    if (error) {
      if (import.meta.env.DEV) {
        console.error("Entry update error:", error);
      }
      toast.error(`Failed to update entry: ${error.message}`);
      return;
    }

    toast.success("Entry updated!");
    setEditDialogOpen(false);
    setEditingEntry(null);
    if (selectedLeaderboard) {
      fetchEntries(selectedLeaderboard);
    }
  };

  const handleAddPointsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addPointsEntry) return;
    if (!addPointsOnlyValue) {
      toast.error("Please enter points to add");
      return;
    }

    const points = parseInt(addPointsOnlyValue);
    if (Number.isNaN(points)) {
      toast.error("Invalid points value");
      return;
    }

    const newScore = addPointsEntry.score + points;

    const { error } = await supabase
      .from("entries")
      .update({ score: newScore })
      .eq("id", addPointsEntry.id);

    if (error) {
      if (import.meta.env.DEV) console.error("Add points error:", error);
      toast.error(`Failed to add points: ${error.message}`);
      return;
    }

    toast.success("Points added!");
    setAddPointsDialogOpen(false);
    setAddPointsEntry(null);
    setAddPointsOnlyValue("");
    if (selectedLeaderboard) fetchEntries(selectedLeaderboard);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Admin Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">Manage leaderboards and entries</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate("/")}>
              <Home className="h-4 w-4 mr-2" />
              Home
            </Button>
            <Button variant="outline" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <Dialog open={leaderboardDialogOpen} onOpenChange={setLeaderboardDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Leaderboard
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Leaderboard</DialogTitle>
                <DialogDescription>Add a new leaderboard to track scores</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateLeaderboard} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="lb-name">Name</Label>
                  <Input
                    id="lb-name"
                    placeholder="Tournament Name"
                    value={newLeaderboardName}
                    onChange={(e) => setNewLeaderboardName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lb-desc">Description (optional)</Label>
                  <Textarea
                    id="lb-desc"
                    placeholder="Tournament details..."
                    value={newLeaderboardDesc}
                    onChange={(e) => setNewLeaderboardDesc(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full">Create</Button>
              </form>
            </DialogContent>
          </Dialog>

          {/* Edit Leaderboard Dialog */}
          <Dialog open={editLeaderboardDialogOpen} onOpenChange={setEditLeaderboardDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Leaderboard</DialogTitle>
                <DialogDescription>Edit name and description for the selected leaderboard</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleUpdateLeaderboard} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-lb-name">Name</Label>
                  <Input
                    id="edit-lb-name"
                    placeholder="Leaderboard Name"
                    value={editLeaderboardName}
                    onChange={(e) => setEditLeaderboardName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-lb-desc">Description (optional)</Label>
                  <Textarea
                    id="edit-lb-desc"
                    placeholder="Tournament details..."
                    value={editLeaderboardDesc}
                    onChange={(e) => setEditLeaderboardDesc(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full">Save</Button>
              </form>
            </DialogContent>
          </Dialog>

          {selectedLeaderboard && (
            <Dialog open={entryDialogOpen} onOpenChange={setEntryDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="secondary">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Entry
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Entry</DialogTitle>
                  <DialogDescription>Add a new player score to the leaderboard</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateEntry} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="player-name">Player Name</Label>
                    <Input
                      id="player-name"
                      placeholder="John Doe"
                      value={newPlayerName}
                      onChange={(e) => setNewPlayerName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="score">Score</Label>
                    <Input
                      id="score"
                      type="number"
                      placeholder="1000"
                      value={newScore}
                      onChange={(e) => setNewScore(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full">Add Entry</Button>
                </form>
              </DialogContent>
            </Dialog>
          )}

          {editingEntry && (
            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit Entry</DialogTitle>
                  <DialogDescription>Update player name and score</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleUpdateEntry} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-player-name">Player Name</Label>
                    <Input
                      id="edit-player-name"
                      placeholder="John Doe"
                      value={editPlayerName}
                      onChange={(e) => setEditPlayerName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-score">Set Score</Label>
                    <Input
                      id="edit-score"
                      type="number"
                      placeholder="1000"
                      value={editScore}
                      onChange={(e) => {
                        setEditScore(e.target.value);
                        setPointsToAdd("");
                      }}
                      required={!pointsToAdd}
                    />
                  </div>
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">Or</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="add-points">Add Points</Label>
                    <Input
                      id="add-points"
                      type="number"
                      placeholder="100"
                      ref={addPointsRef}
                      value={pointsToAdd}
                      onChange={(e) => {
                        setPointsToAdd(e.target.value);
                        if (e.target.value) setEditScore(editingEntry.score.toString());
                      }}
                    />
                    <p className="text-xs text-muted-foreground">
                      Current: {editingEntry.score} {pointsToAdd && `→ New: ${editingEntry.score + parseInt(pointsToAdd || "0")}`}
                    </p>
                  </div>
                  <Button type="submit" className="w-full">Update Entry</Button>
                </form>
              </DialogContent>
            </Dialog>
          )}

          {/* Add Points Only Dialog - opened by clicking non-button areas of an entry card */}
          <Dialog open={addPointsDialogOpen} onOpenChange={setAddPointsDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Points</DialogTitle>
                <DialogDescription>Add points to this player's score</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddPointsSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="add-only-points">Points to Add</Label>
                  <Input
                    id="add-only-points"
                    type="number"
                    placeholder="100"
                    ref={addPointsOnlyRef}
                    value={addPointsOnlyValue}
                    onChange={(e) => setAddPointsOnlyValue(e.target.value)}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Current: {addPointsEntry?.score ?? "-"} {addPointsOnlyValue && `→ New: ${(addPointsEntry?.score ?? 0) + parseInt(addPointsOnlyValue || "0")
                      }`}
                  </p>
                </div>
                <Button type="submit" className="w-full">Add Points</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Leaderboards List */}
          <Card>
            <CardHeader>
              <CardTitle>Leaderboards</CardTitle>
              <CardDescription>Select a leaderboard to manage entries</CardDescription>
            </CardHeader>
            <CardContent>
              {leaderboards.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No leaderboards yet</p>
              ) : (
                <div className="space-y-2">
                  {leaderboards.map((lb) => (
                    <div
                      key={lb.id}
                      className={`flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-all ${selectedLeaderboard === lb.id
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50"
                        }`}
                      onClick={() => {
                        setSelectedLeaderboard(lb.id);
                        fetchEntries(lb.id);
                      }}
                    >
                      <div>
                        <p className="font-semibold">{lb.name}</p>
                        {lb.description && (
                          <p className="text-sm text-muted-foreground">{lb.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditLeaderboard(lb);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteLeaderboard(lb.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Entries List */}
          <Card>
            <CardHeader>
              <CardTitle>Entries</CardTitle>
              <CardDescription>
                {selectedLeaderboard ? "Manage entries for selected leaderboard" : "Select a leaderboard"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!selectedLeaderboard ? (
                <p className="text-center text-muted-foreground py-8">
                  Select a leaderboard to view entries
                </p>
              ) : entries.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No entries yet</p>
              ) : (
                <div className="space-y-2">
                  {entries.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between p-4 rounded-lg border border-border cursor-pointer"
                      onClick={() => {
                        setAddPointsEntry(entry);
                        setAddPointsOnlyValue("");
                        setAddPointsDialogOpen(true);
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                          <span className="text-sm font-bold">#{entry.rank}</span>
                        </div>
                        <div>
                          <p className="font-semibold">{entry.player_name}</p>
                          <p className="text-sm text-primary">{entry.score} points</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditEntry(entry);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteEntry(entry.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Admin;
