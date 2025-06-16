'use client';

import React from 'react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  MoreVertical, 
  Edit, 
  Trash2, 
  Plus,
  Target,
  Calendar,
  DollarSign
} from 'lucide-react';
import { format } from 'date-fns';
import type { WebAppGoal } from '@/types/goal';
import { toast } from 'sonner';
import GoalContributionDialog from './GoalContributionDialog';

interface GoalsListProps {
  goals: WebAppGoal[];
  onEdit: (goal: WebAppGoal) => void;
  onDelete: (goalId: string) => void;
  onUpdate: (goal: WebAppGoal) => void;
}

export default function GoalsList({ goals, onEdit, onDelete, onUpdate }: GoalsListProps) {
  const [contributionGoal, setContributionGoal] = React.useState<WebAppGoal | null>(null);
  const [deletingGoalId, setDeletingGoalId] = React.useState<string | null>(null);

  const handleDelete = async (goalId: string) => {
    if (!confirm('Are you sure you want to delete this goal?')) return;
    
    setDeletingGoalId(goalId);
    try {
      const response = await fetch(`/api/goals/${goalId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete goal');
      }

      onDelete(goalId);
      toast.success('Goal deleted successfully');
    } catch (error) {
      console.error('Error deleting goal:', error);
      toast.error('Failed to delete goal');
    } finally {
      setDeletingGoalId(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500/10 text-green-700 dark:text-green-400';
      case 'overdue':
        return 'bg-red-500/10 text-red-700 dark:text-red-400';
      default:
        return 'bg-blue-500/10 text-blue-700 dark:text-blue-400';
    }
  };

  if (goals.length === 0) {
    return (
      <div className="text-center py-12">
        <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">No goals yet</h3>
        <p className="text-muted-foreground">
          Create your first financial goal to start tracking your progress
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {goals.map((goal) => (
          <Card key={goal.goalId} className="relative">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <h3 className="font-semibold leading-none">{goal.name}</h3>
                  {goal.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {goal.description}
                    </p>
                  )}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      disabled={deletingGoalId === goal.goalId}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit(goal)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleDelete(goal.goalId)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <Badge className={getStatusColor(goal.status)}>
                {goal.status.replace('_', ' ')}
              </Badge>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium">
                    ${goal.currentAmount.toLocaleString()} / ${goal.targetAmount.toLocaleString()}
                  </span>
                </div>
                <Progress 
                  value={goal.progressPercentage || 0} 
                  className="h-2"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {goal.progressPercentage || 0}% complete
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  <span>{format(new Date(goal.targetDate), 'MMM d, yyyy')}</span>
                </div>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <DollarSign className="h-3 w-3" />
                  <span>{goal.daysRemaining} days left</span>
                </div>
              </div>
            </CardContent>

            <CardFooter className="pt-3">
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setContributionGoal(goal)}
                disabled={goal.status === 'completed'}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Contribution
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      {contributionGoal && (
        <GoalContributionDialog
          goal={contributionGoal}
          open={!!contributionGoal}
          onOpenChange={(open) => !open && setContributionGoal(null)}
          onSuccess={(updatedGoal) => {
            onUpdate(updatedGoal);
            setContributionGoal(null);
          }}
        />
      )}
    </>
  );
} 