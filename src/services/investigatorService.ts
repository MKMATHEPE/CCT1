export type Investigator = {
  id: string;
  name: string;
  role: "analyst" | "manager" | "admin";
};

const investigators: Investigator[] = [
  { id: "ana.smith", name: "Ana Smith", role: "analyst" },
  { id: "jamal.khan", name: "Jamal Khan", role: "analyst" },
  { id: "priya.nair", name: "Priya Nair", role: "manager" },
  { id: "luis.fern", name: "Luis Fernandez", role: "analyst" },
];

export function getInvestigators(): Investigator[] {
  return [...investigators];
}
