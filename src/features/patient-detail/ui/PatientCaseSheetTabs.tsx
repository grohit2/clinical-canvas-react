import { Tabs, TabsContent, TabsList, TabsTrigger } from "@shared/components/ui/tabs";
import type { Patient } from "@/types/api";
import { RedZone } from "./zones/RedZone";
import { YellowZone } from "./zones/YellowZone";
import { BlueZone } from "./zones/BlueZone";
import { GreenZone } from "./zones/GreenZone";

type PatientCaseSheetTabsProps = {
  patient?: Patient;
};

export function PatientCaseSheetTabs({ patient }: PatientCaseSheetTabsProps) {
  return (
    <Tabs defaultValue="red" className="w-full">
      <TabsList className="grid grid-cols-4">
        <TabsTrigger value="red">Red</TabsTrigger>
        <TabsTrigger value="yellow">Yellow</TabsTrigger>
        <TabsTrigger value="blue">Blue</TabsTrigger>
        <TabsTrigger value="green">Green</TabsTrigger>
      </TabsList>
      <TabsContent value="red">
        <RedZone patient={patient} />
      </TabsContent>
      <TabsContent value="yellow">
        <YellowZone patient={patient} />
      </TabsContent>
      <TabsContent value="blue">
        <BlueZone patient={patient} />
      </TabsContent>
      <TabsContent value="green">
        <GreenZone patient={patient} />
      </TabsContent>
    </Tabs>
  );
}
