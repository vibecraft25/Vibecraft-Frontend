export interface Section {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  status: "pending" | "active" | "completed";
  color: string;
  description: string;
}
