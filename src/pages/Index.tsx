import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import LeaderboardCard from "@/components/LeaderboardCard";
import { Trophy, Shield, RefreshCw } from "lucide-react";
import heroImage from "@/assets/hero-leaderboard.jpg";

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
}

const Index = () => {
  const [leaderboards, setLeaderboards] = useState<Leaderboard[]>([]);
  const [entriesByBoard, setEntriesByBoard] = useState<Record<string, Entry[]>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchData();

    // Subscribe to real-time changes on entries table
    const channel = supabase
      .channel('entries-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'entries'
        },
        (payload) => {
          console.log('Entry change detected:', payload);
          // Refetch data when entries change
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchData = async (showRefreshing = false) => {
    try {
      if (showRefreshing) setRefreshing(true);
      // Fetch leaderboards
      const { data: leaderboardsData, error: lbError } = await supabase
        .from("leaderboards")
        .select("*")
        .order("created_at", { ascending: false });

      if (lbError) throw lbError;

      setLeaderboards(leaderboardsData || []);

      // Fetch entries for all leaderboards
      if (leaderboardsData && leaderboardsData.length > 0) {
        const { data: entriesData, error: entriesError } = await supabase
          .from("entries")
          .select("*")
          .order("rank", { ascending: true });

        if (entriesError) throw entriesError;

        // Group entries by leaderboard
        const grouped = (entriesData || []).reduce((acc, entry) => {
          if (!acc[entry.leaderboard_id]) {
            acc[entry.leaderboard_id] = [];
          }
          acc[entry.leaderboard_id].push(entry);
          return acc;
        }, {} as Record<string, Entry[]>);

        setEntriesByBoard(grouped);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
      if (showRefreshing) setRefreshing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative h-[60vh] flex items-center justify-center overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroImage})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/80 to-background" />
        </div>
        
        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-primary mb-6 animate-fade-in">
            <Trophy className="h-10 w-10 text-primary-foreground" />
          </div>
          <h1 className="text-5xl md:text-7xl font-bold mb-4 bg-gradient-primary bg-clip-text text-transparent animate-fade-in">
            Championship Leaderboards
          </h1>
          <p className="text-xl text-muted-foreground mb-8 animate-fade-in">
            Track the best players and compete for the top spot
          </p>
          <Link to="/auth">
            <Button size="lg" className="animate-fade-in">
              <Shield className="h-5 w-5 mr-2" />
              Admin Access
            </Button>
          </Link>
        </div>
      </section>

      {/* Leaderboards Grid */}
      <section className="py-16 px-4 max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-bold">Live Leaderboards</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchData(true)}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
        {loading ? (
          <div className="text-center text-muted-foreground">
            <p>Loading leaderboards...</p>
          </div>
        ) : leaderboards.length === 0 ? (
          <div className="text-center py-16">
            <Trophy className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">No Leaderboards Yet</h2>
            <p className="text-muted-foreground mb-6">
              Leaderboards will appear here once created by an admin
            </p>
            <Link to="/auth">
              <Button variant="outline">
                <Shield className="h-4 w-4 mr-2" />
                Admin Login
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-8">
            {leaderboards.map((leaderboard) => (
              <LeaderboardCard
                key={leaderboard.id}
                title={leaderboard.name}
                description={leaderboard.description || undefined}
                entries={(entriesByBoard[leaderboard.id] || []).map(e => ({
                  ...e,
                  rank: e.rank || 0
                }))}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default Index;
