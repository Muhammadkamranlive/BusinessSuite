"use client";

import { NamedMasterPage } from "@/components/hrm/named-master-page";
import { createWorkLocation, listWorkLocations, trashWorkLocation, updateWorkLocation } from "@/modules/hrm/services/workday.store";

export default function LocationsPage() {
  return (
    <NamedMasterPage
      title="Locations"
      description="Workday-style location hierarchy used on positions, requisitions, and job changes."
      entityLabel="location"
      formKey="hrm.location"
      filename="locations"
      extraFields={[
        { key: "city", label: "City" },
        { key: "country", label: "Country" },
        { key: "address", label: "Address" }
      ]}
      list={listWorkLocations}
      create={createWorkLocation}
      update={updateWorkLocation}
      trash={trashWorkLocation}
    />
  );
}
