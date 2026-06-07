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
  payments: {
    id: string;
    amount: number | null;
    payment_date: string | null;
    note: string | null;
  }[];
  expenses: {
    id: string;
    amount: number | null;
    title: string | null;
    created_at: string | null;
  }[];
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
  upcomingJobs: HomeJobRow[];
  recentActivities: HomeActivityItem[];
};

const getLocalTodayKey = () => {
  const now = new Date();
  const yyyy = String(now.getFullYear());
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
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

  const todayKey = getLocalTodayKey();
  const upcomingJobs = [...jobs]
    .filter((job) => {
      const scheduled = job.scheduled_date?.slice(0, 10) ?? null;
      const status = (job.status ?? '').toLowerCase();
      return !job.archived_at && status !== 'done' && (status === 'pending' || Boolean(scheduled && scheduled > todayKey));
    })
    .sort((a, b) => {
      const aTs = parseDateInput(a.scheduled_date)?.getTime() ?? 0;
      const bTs = parseDateInput(b.scheduled_date)?.getTime() ?? 0;
      if (!aTs && bTs) return 1;
      if (aTs && !bTs) return -1;
      return aTs - bTs;
    });

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

  return { upcomingJobs, recentActivities };
}
