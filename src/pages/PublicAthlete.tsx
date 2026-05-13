import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Loader2, Sparkles } from "lucide-react";
import { fetchPublicCard, PublicAthleteCard } from "@/lib/profile";
import { AthleteCard } from "@/components/profile/AthleteCard";
import { AcademicCard } from "@/components/profile/AcademicCard";
import { useTheme } from "@/lib/themes";

const PublicAthlete = () => {
  const { username } = useParams<{ username: string }>();
  useTheme();
  const [data, setData] = useState<PublicAthleteCard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!username) return;
    setLoading(true);
    fetchPublicCard(username)
      .then(setData)
      .finally(() => setLoading(false));
  }, [username]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 text-center">
        <h1 className="text-2xl font-bold">Athlete not found</h1>
        <p className="text-sm text-muted-foreground mt-2">
          No athlete with the username "{username}" exists.
        </p>
        <Link to="/" className="mt-6 text-primary text-sm underline">
          Back to LifeStack
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-10 px-4 flex flex-col items-center">
      <div className="w-full max-w-2xl">
        <AthleteCard
          data={{
            displayName: data.display_name || data.username,
            username: data.username,
            avatarUrl: data.avatar_url,
            bio: data.bio,
            grade: data.grade,
            schoolName: data.school_name,
            age: data.age,
            heightFt: data.height_ft,
            heightIn: data.height_in,
            weightLbs: data.weight_lbs,
            primarySports: data.primary_sports,
            otherSport: data.other_sport,
            positionEvent: data.position_event,
            yearsExperience: data.years_experience,
            fitnessGoals: data.fitness_goals,
            totalXp: data.total_xp,
          }}
        />
        {((data.academic_xp ?? 0) > 0 || data.gpa != null || data.grade_level) && (
          <div className="mt-6">
            <AcademicCard
              data={{
                displayName: data.display_name || data.username,
                gradeLevel: data.grade_level,
                gpa: data.gpa,
                academicXp: data.academic_xp ?? 0,
              }}
            />
          </div>
        )}
        <div className="mt-6 text-center">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary"
          >
            <Sparkles className="h-3 w-3" /> Built with LifeStack
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PublicAthlete;