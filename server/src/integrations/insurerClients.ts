type AlphaResponse = {
  meta: {
    ref: string;
    provider: string;
  };
  handset: {
    imei: string;
    name: string;
    brand?: string;
    category?: string;
  };
  payout: {
    amount: string;
    status: "accept" | "reject" | "review";
  };
  loss: {
    happenedOn?: string;
    note?: string;
  };
};

type BetaResponse = {
  claimId: string;
  deviceIdentifier: string;
  modelName?: string;
  manufacturer?: string;
  type?: string;
  settlement?: number | string | null;
  decision?: "APPROVED" | "REJECTED" | "PENDING" | "WAITING";
  occurredAt?: string | null;
  description?: string | null;
  insurerName: string;
};

const MOCK_DEVICE_FIXTURES: Record<
  string,
  {
    alpha?: AlphaResponse[];
    beta?: BetaResponse[];
  }
> = {
  "354892000001234": {
    alpha: [
      {
        meta: {
          ref: "ALPHA-001234-1",
          provider: "Alpha Insurance",
        },
        handset: {
          imei: "354892000001234",
          name: "Samsung Galaxy S23",
          brand: "Samsung",
          category: "mobile",
        },
        payout: {
          amount: "ZAR 12,500.00",
          status: "accept",
        },
        loss: {
          happenedOn: "2026-02-11",
          note: "Screen and frame damaged after a vehicle break-in.",
        },
      },
    ],
    beta: [
      {
        claimId: "BETA-001234-7",
        deviceIdentifier: "354892000001234",
        modelName: "Galaxy S23",
        manufacturer: "Samsung",
        type: "smartphone",
        settlement: 4200,
        decision: "PENDING",
        occurredAt: "2026-03-01T10:00:00.000Z",
        description: "Water ingress assessment pending final technician report.",
        insurerName: "Beta Assurance",
      },
    ],
  },
  "490154203237518": {
    alpha: [
      {
        meta: {
          ref: "ALPHA-237518-3",
          provider: "Alpha Insurance",
        },
        handset: {
          imei: "490154203237518",
          name: "Apple iPhone 15 Pro",
          brand: "Apple",
          category: "mobile",
        },
        payout: {
          amount: "ZAR 21,999.00",
          status: "review",
        },
        loss: {
          happenedOn: "2026-01-22",
          note: "Reported stolen during an airport transfer.",
        },
      },
    ],
    beta: [],
  },
};

function delay(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function fetchAlpha(imei: string): Promise<AlphaResponse[]> {
  await delay(75);
  return MOCK_DEVICE_FIXTURES[imei]?.alpha ?? [];
}

export async function fetchBeta(imei: string): Promise<BetaResponse[]> {
  await delay(120);
  return MOCK_DEVICE_FIXTURES[imei]?.beta ?? [];
}
