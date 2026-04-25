import { render, screen } from "@testing-library/react";
import { PatientCaseSheetTabs } from "../PatientCaseSheetTabs";

describe("PatientCaseSheetTabs", () => {
  it("renders four tabs", () => {
    render(<PatientCaseSheetTabs patientId="p1" />);
    expect(screen.getByText("Red")).toBeInTheDocument();
    expect(screen.getByText("Yellow")).toBeInTheDocument();
    expect(screen.getByText("Blue")).toBeInTheDocument();
    expect(screen.getByText("Green")).toBeInTheDocument();
  });
});
