interface SavingsTrackerFormProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (tracker: WebAppSavingsTracker) => void;
  editingTracker: WebAppSavingsTracker | null;
  accounts: WebAppAccount[];
  goals: WebAppGoal[];
}

export default function SavingsTrackerForm({
  isOpen,
  onOpenChange,
  onSave,
  editingTracker,
  accounts,
  goals,
}: SavingsTrackerFormProps) {
  // ...
} 