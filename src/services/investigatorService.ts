export type Investigator = {
  id: string;
  name: string;
  role: "client" | "admin";
};

const investigators: Investigator[] = [
  { id: "ana.smith", name: "Ana Smith", role: "client" },
  { id: "jamal.khan", name: "Jamal Khan", role: "client" },
  { id: "priya.nair", name: "Priya Nair", role: "admin" },
  { id: "luis.fern", name: "Luis Fernandez", role: "client" },
];

export function getInvestigators(): Investigator[] {
  return [...investigators];
}
