import { supabase } from '@/lib/supabase';
import { parseDateInput } from '@/lib/date';

type HomeJobRow = {
  id: string;
  title: string | null;
  status: string | null;
  scheduled_date: string | null;
  completed_at: string | null;
  archived_at: string | null;
  created_at: string | null;
  price: number | null;
  client: { name: string | null } | null;
  payments: Array<{
    id: string;
    amount: number | null;
    payment_date: string | null;
    note: string | null;
  }>;
  expenses: Array<{
    id: string;
    amount: number | null;
    title: string | null;
    created_at: string | null;
  }>;
};

export type HomeActivityItem = {
  id: string;
  jobId: string;
  type: 'payment' | 'expense' | 'completed';
  title: string;
  subtitle: string | null;
  amount: number | null;
  date: string | null;
};

export type HomeFeed = {
  activeJobs: HomeJobRow[];
  recentActivities: HomeActivityItem[];
};

export async function getHomeFeed(userId: string): Promise<HomeFeed> {
  const { data, error } = await supabase
    .from('jobs')
    .select(
      'id,title,status,scheduled_date,completed_at,archived_at,created_at,price,client:clients(name),payments(id,amount,payment_date,note),expenses(id,amount,title,created_at)'
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .overrideTypes<HomeJobRow[], { merge: false }>();

  if (error) throw new Error(error.message);

  const jobs = data ?? [];

  const activeJobs = [...jobs]
    .filter((job) => !job.archived_at && (job.status ?? '').toLowerCase() === 'in_progress')
    .sort((a, b) => {
      const aTs = parseDateInput(a.scheduled_date ?? a.created_at)?.getTime() ?? 0;
      const bTs = parseDateInput(b.scheduled_date ?? b.created_at)?.getTime() ?? 0;
      return aTs - bTs;
    })
    .slice(0, 3);

  const recentActivities = jobs
    .flatMap<HomeActivityItem>((job) => {
      const title = job.title || 'Bez naslova';
      const clientName = job.client?.name ?? null;

      const items: HomeActivityItem[] = [];

      if (job.completed_at) {
        items.push({
          id: `${job.id}-completed`,
          jobId: job.id,
          type: 'completed',
          title,
          subtitle: clientName,
          amount: job.price ?? null,
          date: job.completed_at,
        });
      }

      (job.payments ?? []).forEach((payment) => {
        items.push({
          id: payment.id,
          jobId: job.id,
          type: 'payment',
          title,
          subtitle: payment.note?.trim() || clientName,
          amount: payment.amount ?? null,
          date: payment.payment_date,
        });
      });

      (job.expenses ?? []).forEach((expense) => {
        items.push({
          id: expense.id,
          jobId: job.id,
          type: 'expense',
          title,
          subtitle: expense.title?.trim() || clientName,
          amount: expense.amount ?? null,
          date: expense.created_at,
        });
      });

      return items;
    })
    .sort((a, b) => {
      const aTs = parseDateInput(a.date)?.getTime() ?? 0;
      const bTs = parseDateInput(b.date)?.getTime() ?? 0;
      return bTs - aTs;
    })
    .slice(0, 5);

  return { activeJobs, recentActivities };
}
