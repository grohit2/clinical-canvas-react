import { useState, useMemo } from "react";
import { Header } from "@/components/layout/Header";
import { BottomBar } from "@/components/layout/BottomBar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Search, ArrowRight, Calendar, Clock, AlertCircle, Construction } from "lucide-react";

// Types
type ReferralStatus = "Initiated" | "Accepted" | "Completed" | "Closed";
type ConsultStatus = "Requested" | "Accepted" | "Completed";
type Priority = "Normal" | "Urgent";

interface Patient {
  id: string;
  name: string;
  mrn?: string;
}

interface ReferralItem {
  type: "referral";
  id: string;
  patient: Patient;
  referring_provider: string;
  referred_to_provider: string;
  status: ReferralStatus;
  priority: Priority;
  reason?: string;
  created_at: string;
  updated_at?: string;
  appointment_at?: string;
  expected_response_by?: string;
  completed_at?: string;
}

interface ConsultItem {
  type: "consult";
  id: string;
  patient: Patient;
  from_department: string;
  to_department: string;
  requested_by: string;
  consulting_doctor: string | null;
  status: ConsultStatus;
  priority: Priority;
  reason?: string;
  created_at: string;
  updated_at?: string;
  scheduled_at?: string;
  expected_response_by?: string;
  completed_at?: string;
}

type Item = ReferralItem | ConsultItem;

// Mock current user
const CURRENT_USER = {
  name: "Dr. Kamalika",
  department: "General Surgery",
};

// Mock data
const MOCK_DATA: Item[] = [
  {
    type: "referral",
    id: "REF-10021",
    patient: { id: "P-001", name: "Anita Rao", mrn: "MRN001" },
    referring_provider: "Dr. Mehta (PCP)",
    referred_to_provider: "Dr. Kapoor (Orthopedics)",
    status: "Accepted",
    priority: "Normal",
    reason: "Chronic knee pain, requires orthopedic evaluation",
    created_at: "2025-11-05T10:05:00Z",
    appointment_at: "2025-11-09T09:30:00Z",
    expected_response_by: "2025-11-06T10:05:00Z",
  },
  {
    type: "consult",
    id: "CONS-20011",
    patient: { id: "P-007", name: "Priya Desai", mrn: "MRN007" },
    from_department: "General Medicine",
    to_department: "Cardiology",
    requested_by: "Dr. Nair",
    consulting_doctor: null,
    status: "Requested",
    priority: "Urgent",
    reason: "Suspected myocardial infarction, needs immediate cardiology consult",
    created_at: "2025-11-06T07:50:00Z",
    expected_response_by: "2025-11-06T12:00:00Z",
  },
  {
    type: "referral",
    id: "REF-10022",
    patient: { id: "P-002", name: "Rajesh Kumar", mrn: "MRN002" },
    referring_provider: "Dr. Kamalika",
    referred_to_provider: "Dr. Sharma (Neurology)",
    status: "Initiated",
    priority: "Urgent",
    reason: "Persistent headaches with neurological symptoms",
    created_at: "2025-11-04T14:20:00Z",
    expected_response_by: "2025-11-05T14:20:00Z",
  },
  {
    type: "consult",
    id: "CONS-20012",
    patient: { id: "P-008", name: "Lakshmi Reddy", mrn: "MRN008" },
    from_department: "Cardiology",
    to_department: "General Surgery",
    requested_by: "Dr. Patel",
    consulting_doctor: "Dr. Kamalika",
    status: "Accepted",
    priority: "Normal",
    reason: "Pre-operative cardiac clearance",
    created_at: "2025-11-05T11:00:00Z",
    scheduled_at: "2025-11-08T15:00:00Z",
    expected_response_by: "2025-11-06T11:00:00Z",
  },
  {
    type: "referral",
    id: "REF-10023",
    patient: { id: "P-003", name: "Mohammed Ali", mrn: "MRN003" },
    referring_provider: "Dr. Singh (ER)",
    referred_to_provider: "Dr. Kamalika",
    status: "Completed",
    priority: "Urgent",
    reason: "Acute appendicitis",
    created_at: "2025-11-03T08:30:00Z",
    completed_at: "2025-11-03T16:45:00Z",
    expected_response_by: "2025-11-03T12:00:00Z",
  },
];

export default function Referrals() {
  const [patientFilter, setPatientFilter] = useState<"all" | "my">("my");
  const [directionFilter, setDirectionFilter] = useState<"sent" | "received">("received");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<"new-old" | "old-new">("new-old");
  const [prototypeDialogOpen, setPrototypeDialogOpen] = useState(false);

  // Helper: Check if item is "mine"
  const isMyPatient = (item: Item): boolean => {
    if (item.type === "referral") {
      return (
        item.referring_provider.includes(CURRENT_USER.name) ||
        item.referred_to_provider.includes(CURRENT_USER.name)
      );
    } else {
      return (
        item.requested_by.includes(CURRENT_USER.name) ||
        item.consulting_doctor?.includes(CURRENT_USER.name) ||
        item.to_department === CURRENT_USER.department ||
        item.from_department === CURRENT_USER.department
      );
    }
  };

  // Helper: Check direction
  const isSent = (item: Item): boolean => {
    if (item.type === "referral") {
      return item.referring_provider.includes(CURRENT_USER.name);
    } else {
      return (
        item.requested_by.includes(CURRENT_USER.name) ||
        item.from_department === CURRENT_USER.department
      );
    }
  };

  const isReceived = (item: Item): boolean => {
    if (item.type === "referral") {
      return item.referred_to_provider.includes(CURRENT_USER.name);
    } else {
      return (
        item.consulting_doctor?.includes(CURRENT_USER.name) ||
        item.to_department === CURRENT_USER.department
      );
    }
  };

  // Helper: Check if delayed
  const isDelayed = (item: Item): boolean => {
    const now = new Date();
    const created = new Date(item.created_at);
    const hoursElapsed = (now.getTime() - created.getTime()) / (1000 * 60 * 60);

    if (item.expected_response_by) {
      const expected = new Date(item.expected_response_by);
      return now > expected && hoursElapsed > 24;
    }

    const incompletStatuses: string[] = ["Initiated", "Requested", "Accepted"];
    return incompletStatuses.includes(item.status) && hoursElapsed >= 24;
  };

  // Filter and search
  const filteredItems = useMemo(() => {
    let items = MOCK_DATA;

    // Patient filter
    if (patientFilter === "my") {
      items = items.filter(isMyPatient);
    }

    // Direction filter
    items = items.filter((item) => {
      if (directionFilter === "sent") return isSent(item);
      if (directionFilter === "received") return isReceived(item);
      return true;
    });

    // Search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      items = items.filter((item) => {
        const patientMatch = item.patient.name.toLowerCase().includes(query) ||
          item.patient.mrn?.toLowerCase().includes(query);
        const idMatch = item.id.toLowerCase().includes(query);
        const reasonMatch = item.reason?.toLowerCase().includes(query);

        let providerMatch = false;
        if (item.type === "referral") {
          providerMatch =
            item.referring_provider.toLowerCase().includes(query) ||
            item.referred_to_provider.toLowerCase().includes(query);
        } else {
          providerMatch =
            item.from_department.toLowerCase().includes(query) ||
            item.to_department.toLowerCase().includes(query) ||
            item.requested_by.toLowerCase().includes(query) ||
            item.consulting_doctor?.toLowerCase().includes(query) || false;
        }

        return patientMatch || idMatch || reasonMatch || providerMatch;
      });
    }

    // Sort
    items.sort((a, b) => {
      const aDate = new Date(a.created_at).getTime();
      const bDate = new Date(b.created_at).getTime();
      return sortOrder === "new-old" ? bDate - aDate : aDate - bDate;
    });

    return items;
  }, [patientFilter, directionFilter, searchQuery, sortOrder]);

  // Stats
  const stats = useMemo(() => {
    const total = filteredItems.length;
    const urgent = filteredItems.filter((item) => item.priority === "Urgent").length;
    const delayed = filteredItems.filter(isDelayed).length;
    return { total, urgent, delayed };
  }, [filteredItems]);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "—";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  };

  const formatTime = (dateStr?: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Completed":
      case "Closed":
        return "bg-green-100 text-green-800";
      case "Accepted":
        return "bg-blue-100 text-blue-800";
      case "Initiated":
      case "Requested":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handleViewDetails = () => {
    setPrototypeDialogOpen(true);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header title="Referrals & Consults" />

      <div className="p-4 space-y-4">
        {/* Filters */}
        <div className="flex items-center gap-2">
          <Tabs value={patientFilter} onValueChange={(v) => setPatientFilter(v as "all" | "my")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="all">All Patients</TabsTrigger>
              <TabsTrigger value="my">My Patients</TabsTrigger>
            </TabsList>
          </Tabs>

          <Tabs value={directionFilter} onValueChange={(v) => setDirectionFilter(v as "sent" | "received")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="sent">Sent</TabsTrigger>
              <TabsTrigger value="received">Received</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Stats Bar */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="px-3 py-1">
              Total: {stats.total}
            </Badge>
            {stats.urgent > 0 && (
              <Badge className="bg-red-100 text-red-800 px-3 py-1">
                Urgent: {stats.urgent}
              </Badge>
            )}
            {stats.delayed > 0 && (
              <Badge className="bg-orange-100 text-orange-800 px-3 py-1">
                Delayed: {stats.delayed}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-40 sm:w-64"
              />
            </div>

            <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as "new-old" | "old-new")}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new-old">New → Old</SelectItem>
                <SelectItem value="old-new">Old → New</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* List */}
        <div className="space-y-3">
          {filteredItems.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground mb-4">No items match your filters.</p>
              <Button
                variant="outline"
                onClick={() => {
                  setSearchQuery("");
                  setPatientFilter("all");
                }}
              >
                Clear Filters
              </Button>
            </Card>
          ) : (
            filteredItems.map((item) => (
              <Card key={item.id} className="p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    {/* Patient Name */}
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-base truncate">
                        {item.patient.name}
                      </h3>
                      {item.patient.mrn && (
                        <span className="text-sm text-muted-foreground">
                          ({item.patient.mrn})
                        </span>
                      )}
                    </div>

                    {/* Direction & Parties */}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                      {item.type === "referral" ? (
                        <>
                          <span className="truncate">{item.referring_provider}</span>
                          <ArrowRight className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{item.referred_to_provider}</span>
                        </>
                      ) : (
                        <>
                          <span className="truncate">
                            {item.from_department} ({item.requested_by})
                          </span>
                          <ArrowRight className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">
                            {item.to_department}
                            {item.consulting_doctor && ` (${item.consulting_doctor})`}
                          </span>
                        </>
                      )}
                    </div>

                    {/* Tags & Status */}
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <Badge variant="outline" className="text-xs">
                        {item.type === "referral" ? "Referral" : "Cross-Consult"}
                      </Badge>
                      <Badge className={`text-xs ${getStatusColor(item.status)}`}>
                        {item.status}
                      </Badge>
                      {item.priority === "Urgent" && (
                        <Badge className="text-xs bg-red-100 text-red-800">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Urgent
                        </Badge>
                      )}
                      {isDelayed(item) && (
                        <Badge className="text-xs bg-orange-100 text-orange-800">
                          <Clock className="h-3 w-3 mr-1" />
                          Delayed &gt;1d
                        </Badge>
                      )}
                    </div>

                    {/* Meta */}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(item.created_at)}
                      </span>
                      {(item.type === "referral" ? item.appointment_at : item.type === "consult" ? item.scheduled_at : null) && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {item.type === "referral"
                            ? `Appt: ${formatDate(item.appointment_at)}`
                            : `Scheduled: ${formatDate((item as ConsultItem).scheduled_at)}`}
                        </span>
                      )}
                    </div>

                    {/* Reason snippet */}
                    {item.reason && (
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                        {item.reason}
                      </p>
                    )}
                  </div>

                  {/* View Button */}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleViewDetails}
                    className="flex-shrink-0"
                  >
                    View
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Prototype Dialog */}
      <AlertDialog open={prototypeDialogOpen} onOpenChange={setPrototypeDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center">
                <Construction className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <AlertDialogTitle>Feature in Development</AlertDialogTitle>
              </div>
            </div>
            <AlertDialogDescription className="text-base">
              This feature is currently in the <strong>prototyping stage</strong>. Full referral and
              cross-consultation management capabilities are being developed and will be available soon.
              <br />
              <br />
              In the meantime, you can explore the list view to see how referrals and consults will be
              organized and filtered.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setPrototypeDialogOpen(false)}>
              Got it
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BottomBar />
    </div>
  );
}
