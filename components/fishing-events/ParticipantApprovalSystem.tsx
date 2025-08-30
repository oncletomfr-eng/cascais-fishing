'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  UserCheck,
  UserX,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  MessageCircle,
  Star,
  Trophy,
  Fish,
  Target,
  Calendar,
  MapPin,
  User,
  Users,
  Crown,
  Shield,
  Award,
  Eye,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  Bell,
  Settings,
  Filter,
  Search,
  MoreVertical,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

// 🔐 APPROVAL TYPES
type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'AUTO_APPROVED';
type ApprovalMode = 'AUTO' | 'MANUAL' | 'SKILL_BASED';
type ParticipantType = 'HOST' | 'PARTICIPANT' | 'PENDING';

interface ParticipantProfile {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  joinedAt: Date;
  status: ApprovalStatus;
  type: ParticipantType;
  skillLevel?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
  experienceYears?: number;
  previousTrips?: number;
  rating?: number;
  badges?: string[];
  lastActive?: Date;
  notes?: string;
  specialRequests?: string;
  equipmentOwned?: string[];
}

interface FishingEventApproval {
  eventId: string;
  eventTitle: string;
  approvalMode: ApprovalMode;
  autoApprovalCriteria?: {
    minRating?: number;
    minTrips?: number;
    skillLevel?: string[];
  };
  participants: ParticipantProfile[];
  pendingCount: number;
  approvedCount: number;
  maxParticipants: number;
  hostId: string;
}

// 🏆 PARTICIPANT CARD COMPONENT
interface ParticipantCardProps {
  participant: ParticipantProfile;
  onApprove: (participantId: string, notes?: string) => void;
  onReject: (participantId: string, reason: string) => void;
  onViewProfile: (participantId: string) => void;
  canManage: boolean;
  eventInfo?: {
    skillLevel: string;
    eventType: string;
  };
}

function ParticipantCard({
  participant,
  onApprove,
  onReject,
  onViewProfile,
  canManage,
  eventInfo,
}: ParticipantCardProps) {
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [approvalNotes, setApprovalNotes] = useState('');

  const getStatusColor = (status: ApprovalStatus) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'APPROVED': return 'bg-green-100 text-green-800 border-green-300';
      case 'REJECTED': return 'bg-red-100 text-red-800 border-red-300';
      case 'AUTO_APPROVED': return 'bg-blue-100 text-blue-800 border-blue-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusIcon = (status: ApprovalStatus) => {
    switch (status) {
      case 'PENDING': return <Clock className="h-4 w-4" />;
      case 'APPROVED': return <CheckCircle className="h-4 w-4" />;
      case 'REJECTED': return <XCircle className="h-4 w-4" />;
      case 'AUTO_APPROVED': return <Shield className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getSkillBadgeColor = (skillLevel?: string) => {
    switch (skillLevel) {
      case 'BEGINNER': return 'bg-green-100 text-green-800';
      case 'INTERMEDIATE': return 'bg-yellow-100 text-yellow-800';
      case 'ADVANCED': return 'bg-orange-100 text-orange-800';
      case 'EXPERT': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleReject = () => {
    if (!rejectReason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }
    onReject(participant.id, rejectReason);
    setRejectDialogOpen(false);
    setRejectReason('');
  };

  const handleApprove = () => {
    onApprove(participant.id, approvalNotes);
    setApprovalNotes('');
  };

  return (
    <Card className="relative overflow-hidden hover:shadow-md transition-shadow">
      {/* Status indicator */}
      <div className={cn(
        'absolute top-0 right-0 w-2 h-full',
        participant.status === 'PENDING' ? 'bg-yellow-400' :
        participant.status === 'APPROVED' || participant.status === 'AUTO_APPROVED' ? 'bg-green-400' :
        participant.status === 'REJECTED' ? 'bg-red-400' : 'bg-gray-400'
      )} />

      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="w-12 h-12">
              <AvatarImage src={participant.avatar} alt={participant.name} />
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white">
                {participant.name.split(' ').map(n => n[0]).join('').toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h4 className="font-semibold text-sm">{participant.name}</h4>
                {participant.type === 'HOST' && (
                  <Crown className="h-4 w-4 text-yellow-500" />
                )}
                {participant.badges && participant.badges.length > 0 && (
                  <div className="flex gap-1">
                    {participant.badges.slice(0, 2).map((badge, i) => (
                      <TooltipProvider key={i}>
                        <Tooltip>
                          <TooltipTrigger>
                            <Award className="h-3 w-3 text-yellow-500" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{badge}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="flex items-center gap-2 mt-1">
                <Badge 
                  variant="outline"
                  className={cn('text-xs', getStatusColor(participant.status))}
                >
                  {getStatusIcon(participant.status)}
                  <span className="ml-1">{participant.status.replace('_', ' ')}</span>
                </Badge>
                
                {participant.skillLevel && (
                  <Badge 
                    variant="outline"
                    className={cn('text-xs', getSkillBadgeColor(participant.skillLevel))}
                  >
                    {participant.skillLevel.toLowerCase()}
                  </Badge>
                )}
                
                {participant.rating && (
                  <div className="flex items-center gap-1">
                    <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                    <span className="text-xs text-muted-foreground">
                      {participant.rating.toFixed(1)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => onViewProfile(participant.id)}
            className="opacity-60 hover:opacity-100"
          >
            <Eye className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Participant Stats */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="space-y-1">
            <div className="text-lg font-semibold text-blue-600">
              {participant.experienceYears || 0}
            </div>
            <div className="text-xs text-muted-foreground">Years</div>
          </div>
          <div className="space-y-1">
            <div className="text-lg font-semibold text-green-600">
              {participant.previousTrips || 0}
            </div>
            <div className="text-xs text-muted-foreground">Trips</div>
          </div>
          <div className="space-y-1">
            <div className="text-lg font-semibold text-purple-600">
              {participant.rating ? participant.rating.toFixed(1) : 'N/A'}
            </div>
            <div className="text-xs text-muted-foreground">Rating</div>
          </div>
        </div>

        {/* Equipment & Special Requests */}
        {(participant.equipmentOwned || participant.specialRequests) && (
          <div className="space-y-2 text-xs">
            {participant.equipmentOwned && participant.equipmentOwned.length > 0 && (
              <div className="flex items-center gap-2">
                <Target className="h-3 w-3 text-blue-500" />
                <span className="text-muted-foreground">Equipment:</span>
                <div className="flex flex-wrap gap-1">
                  {participant.equipmentOwned.slice(0, 2).map((item, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      {item}
                    </Badge>
                  ))}
                  {participant.equipmentOwned.length > 2 && (
                    <Badge variant="outline" className="text-xs">
                      +{participant.equipmentOwned.length - 2}
                    </Badge>
                  )}
                </div>
              </div>
            )}
            
            {participant.specialRequests && (
              <div className="flex items-start gap-2">
                <MessageCircle className="h-3 w-3 text-orange-500 mt-0.5" />
                <div>
                  <span className="text-muted-foreground">Special requests:</span>
                  <p className="text-foreground mt-1">{participant.specialRequests}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons - Only for pending participants */}
        {canManage && participant.status === 'PENDING' && (
          <div className="flex gap-2 pt-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button size="sm" className="flex-1" variant="default">
                  <ThumbsUp className="h-4 w-4 mr-1" />
                  Approve
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Approve Participant</DialogTitle>
                  <DialogDescription>
                    Confirm approval for {participant.name} to join this fishing event.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <Textarea
                    placeholder="Optional approval notes..."
                    value={approvalNotes}
                    onChange={(e) => setApprovalNotes(e.target.value)}
                    rows={3}
                  />
                </div>
                <DialogFooter>
                  <Button variant="outline">Cancel</Button>
                  <Button onClick={handleApprove}>
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Approve Participant
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <AlertDialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="destructive" className="flex-1">
                  <ThumbsDown className="h-4 w-4 mr-1" />
                  Reject
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Reject Participant</AlertDialogTitle>
                  <AlertDialogDescription>
                    Please provide a reason for rejecting {participant.name}'s application.
                    They will be notified of this decision.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <Textarea
                  placeholder="Reason for rejection (required)..."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  rows={3}
                  className="mb-4"
                />
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setRejectReason('')}>
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={handleReject}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Reject Participant
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}

        {/* Join Date & Status Info */}
        <div className="flex justify-between items-center text-xs text-muted-foreground pt-2 border-t">
          <span>Applied {format(participant.joinedAt, 'MMM dd, HH:mm')}</span>
          {participant.lastActive && (
            <span>Last active {format(participant.lastActive, 'MMM dd')}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// 🔐 MAIN APPROVAL SYSTEM COMPONENT
interface ParticipantApprovalSystemProps {
  eventApproval: FishingEventApproval;
  currentUserId: string;
  onApproveParticipant: (participantId: string, notes?: string) => Promise<void>;
  onRejectParticipant: (participantId: string, reason: string) => Promise<void>;
  onUpdateApprovalMode: (mode: ApprovalMode, criteria?: any) => Promise<void>;
  className?: string;
}

export function ParticipantApprovalSystem({
  eventApproval,
  currentUserId,
  onApproveParticipant,
  onRejectParticipant,
  onUpdateApprovalMode,
  className,
}: ParticipantApprovalSystemProps) {
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');
  const [loading, setLoading] = useState(false);

  const isHost = eventApproval.hostId === currentUserId;
  
  const filteredParticipants = eventApproval.participants.filter(participant => {
    if (filter === 'ALL') return true;
    return participant.status === filter;
  });

  const pendingParticipants = eventApproval.participants.filter(p => p.status === 'PENDING');
  const approvedParticipants = eventApproval.participants.filter(p => 
    p.status === 'APPROVED' || p.status === 'AUTO_APPROVED'
  );

  const handleApprove = async (participantId: string, notes?: string) => {
    setLoading(true);
    try {
      await onApproveParticipant(participantId, notes);
      toast.success('Participant approved successfully!');
    } catch (error) {
      toast.error('Failed to approve participant');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (participantId: string, reason: string) => {
    setLoading(true);
    try {
      await onRejectParticipant(participantId, reason);
      toast.success('Participant rejected');
    } catch (error) {
      toast.error('Failed to reject participant');
    } finally {
      setLoading(false);
    }
  };

  const handleViewProfile = (participantId: string) => {
    // Navigate to participant profile or open modal
    toast.info(`Opening profile for participant ${participantId}`);
  };

  const approvalProgress = (approvedParticipants.length / eventApproval.maxParticipants) * 100;

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header & Stats */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />
                Participant Management
                {pendingParticipants.length > 0 && (
                  <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                    {pendingParticipants.length} pending
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="mt-1">
                {eventApproval.eventTitle} • {eventApproval.approvalMode.toLowerCase().replace('_', ' ')} approval
              </CardDescription>
            </div>
            
            {isHost && (
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-1" />
                Settings
              </Button>
            )}
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Event Capacity</span>
              <span>{approvedParticipants.length}/{eventApproval.maxParticipants} confirmed</span>
            </div>
            <Progress value={approvalProgress} className="h-2" />
            {approvalProgress >= 100 && (
              <p className="text-sm text-green-600 font-medium">✅ Event is fully booked!</p>
            )}
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-4 gap-4 text-center">
            <div className="space-y-1">
              <div className="text-2xl font-bold text-blue-600">
                {eventApproval.participants.length}
              </div>
              <div className="text-xs text-muted-foreground">Total Applications</div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold text-yellow-600">
                {pendingParticipants.length}
              </div>
              <div className="text-xs text-muted-foreground">Pending Review</div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold text-green-600">
                {approvedParticipants.length}
              </div>
              <div className="text-xs text-muted-foreground">Approved</div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold text-red-600">
                {eventApproval.participants.filter(p => p.status === 'REJECTED').length}
              </div>
              <div className="text-xs text-muted-foreground">Rejected</div>
            </div>
          </div>

          {/* Filter Buttons */}
          <div className="flex gap-2">
            {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map((filterType) => (
              <Button
                key={filterType}
                variant={filter === filterType ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter(filterType)}
                className="text-xs"
              >
                {filterType === 'ALL' ? 'All' : filterType.toLowerCase()}
                {filterType !== 'ALL' && (
                  <span className="ml-1">
                    ({eventApproval.participants.filter(p => 
                      filterType === 'APPROVED' 
                        ? p.status === 'APPROVED' || p.status === 'AUTO_APPROVED'
                        : p.status === filterType
                    ).length})
                  </span>
                )}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Participant List */}
      <div className="space-y-4">
        {filteredParticipants.length === 0 ? (
          <Card className="p-8 text-center">
            <div className="flex flex-col items-center gap-4">
              <Users className="h-12 w-12 text-muted-foreground" />
              <div>
                <h3 className="text-lg font-semibold">No participants found</h3>
                <p className="text-muted-foreground">
                  {filter === 'PENDING' 
                    ? 'No pending applications at the moment'
                    : `No ${filter.toLowerCase()} participants`
                  }
                </p>
              </div>
            </div>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredParticipants.map((participant) => (
              <ParticipantCard
                key={participant.id}
                participant={participant}
                onApprove={handleApprove}
                onReject={handleReject}
                onViewProfile={handleViewProfile}
                canManage={isHost && !loading}
                eventInfo={{
                  skillLevel: 'INTERMEDIATE', // From event data
                  eventType: 'COMMERCIAL', // From event data
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Bulk Actions (for hosts with pending participants) */}
      {isHost && pendingParticipants.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Bulk Actions</CardTitle>
            <CardDescription>
              Manage multiple pending participants at once
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Button size="sm" variant="outline">
                <CheckCircle className="h-4 w-4 mr-1" />
                Approve All Qualified
              </Button>
              <Button size="sm" variant="outline">
                <MessageSquare className="h-4 w-4 mr-1" />
                Send Message to Pending
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
