import { supabase } from './supabase.js';

export const saveTestSubmission = async (profile, answers, results) => {
  try {
    const { data, error } = await supabase
      .from('test_submissions')
      .insert([
        {
          name: profile.name,
          email: profile.email,
          school: profile.school,
          answers: answers, // ansTF object
          top3: results.top3,
          radar_data: results.radarData,
          area_percents: results.areaPercents,
          interest_percents: results.interestPercents,
          pillar_agg: results.pillarAgg,
          pillar_counts: results.pillarCounts,
          submitted_at: new Date().toISOString(),
        }
      ]);

    if (error) {
      console.error('Supabase insert error:', error);
      return false;
    }

    console.log('Submission saved to Supabase:', data);
    return true;
  } catch (err) {
    console.error('Unexpected error saving to Supabase:', err);
    return false;
  }
};

export const getTestSubmissions = async () => {
  try {
    const { data, error } = await supabase
      .from('test_submissions')
      .select('*')
      .order('submitted_at', { ascending: false });

    if (error) {
      console.error('Supabase select error:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('Unexpected error fetching from Supabase:', err);
    return [];
  }
};
