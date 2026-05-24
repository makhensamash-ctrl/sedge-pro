import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import EarlyBirdDialog from "./EarlyBirdDialog";
import "@testing-library/jest-dom";

// Mock supabase client to avoid network requests
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
  },
}));

// Mock useSiteSetting hook
vi.mock("@/hooks/useSiteContent", () => ({
  useSiteSetting: () => ({
    value: {
      once_off: "5000",
      monthly: "700",
    },
    loading: false,
  }),
}));

describe("EarlyBirdDialog Conditionally Hidden Fields", () => {
  it("should render all fields including Registration Number and Where did you hear about us when fromExternal is not true", () => {
    const initialData = {
      client_name: "Jane Doe",
      email: "jane@example.com",
      phone: "+27 82 987 6543",
      businessName: "Jane Construction",
      billingAddress: "456 Oak Ave, Randburg",
      heardAbout: "Referral",
      plan: "monthly",
      fromExternal: false,
    };

    render(
      <EarlyBirdDialog
        open={true}
        onOpenChange={() => {}}
        initialData={initialData}
      />
    );

    // Verify inputs are populated
    expect(screen.getByLabelText(/Full Name/i)).toHaveValue("Jane Doe");
    expect(screen.getByLabelText(/Email/i)).toHaveValue("jane@example.com");

    // Verify registration number and where did you hear about us fields ARE in the DOM
    expect(screen.getByLabelText(/Registration Number/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Where did you hear about us/i)).toBeInTheDocument();
  });

  it("should hide Registration Number and Where did you hear about us fields when fromExternal is true", () => {
    const initialData = {
      client_name: "Jane Doe",
      email: "jane@example.com",
      phone: "+27 82 987 6543",
      businessName: "Jane Construction",
      billingAddress: "456 Oak Ave, Randburg",
      heardAbout: "Referral",
      plan: "monthly",
      fromExternal: true, // External referral flag active
    };

    render(
      <EarlyBirdDialog
        open={true}
        onOpenChange={() => {}}
        initialData={initialData}
      />
    );

    // Verify inputs are populated
    expect(screen.getByLabelText(/Full Name/i)).toHaveValue("Jane Doe");
    expect(screen.getByLabelText(/Email/i)).toHaveValue("jane@example.com");

    // Verify registration number and where did you hear about us fields ARE NOT in the DOM
    expect(screen.queryByLabelText(/Registration Number/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Where did you hear about us/i)).not.toBeInTheDocument();
  });
});
