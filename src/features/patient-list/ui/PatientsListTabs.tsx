import { Tabs, TabsContent, TabsList, TabsTrigger } from "@shared/components/ui/tabs";
import type { TabFilter } from "../model/usePatientsFilters";

interface PatientsListTabsProps {
  activeTab: TabFilter;
  onTabChange: (tab: TabFilter) => void;
  allPatientsContent: React.ReactNode;
  myPatientsContent: React.ReactNode;
}

export function PatientsListTabs({
  activeTab,
  onTabChange,
  allPatientsContent,
  myPatientsContent,
}: PatientsListTabsProps) {
  return (
    <Tabs value={activeTab} onValueChange={(v) => onTabChange(v as TabFilter)} className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="all">All Patients</TabsTrigger>
        <TabsTrigger value="my">My Patients</TabsTrigger>
      </TabsList>

      <TabsContent value="all" className="space-y-4 mt-4">
        {allPatientsContent}
      </TabsContent>

      <TabsContent value="my" className="space-y-4 mt-4">
        {myPatientsContent}
      </TabsContent>
    </Tabs>
  );
}
