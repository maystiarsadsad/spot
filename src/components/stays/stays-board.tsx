"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import type { StaySettings } from "@/lib/stays/pricing";
import { FrontDesk } from "./front-desk";
import { TapeChart } from "./tape-chart";
import { StaysList } from "./stays-list";
import { RoomsPanel } from "./rooms-panel";
import { RatesPanel } from "./rates-panel";
import { StayDialog } from "./stay-dialog";
import { NewStayDialog, type NewStayPrefill } from "./new-stay-dialog";
import type { RoomRow, RoomTypeRow, SeasonRow, ServiceOption, StayRow } from "./types";

interface Props {
  businessId: string;
  slug: string;
  siteUrl: string;
  currency: string;
  isHostel: boolean;
  today: string;
  tab: string;
  from: string;
  stays: StayRow[];
  rooms: RoomRow[];
  roomTypes: RoomTypeRow[];
  seasons: SeasonRow[];
  services: ServiceOption[];
  settings: StaySettings;
}

const TABS = ["hoy", "calendario", "reservas", "habitaciones", "tarifas"];

export function StaysBoard(props: Props) {
  const { businessId, currency, today, stays, rooms, roomTypes } = props;
  const [openId, setOpenId] = useState<string | null>(null);
  const [prefill, setPrefill] = useState<NewStayPrefill | null>(null);
  // Derived from the latest server data, so the dialog refreshes after each action
  const openStay = stays.find((s) => s.id === openId) ?? null;
  const open = (s: StayRow) => setOpenId(s.id);

  return (
    <>
      <Tabs defaultValue={TABS.includes(props.tab) ? props.tab : "hoy"}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <TabsList>
            <TabsTrigger value="hoy">Hoy</TabsTrigger>
            <TabsTrigger value="calendario">Calendario</TabsTrigger>
            <TabsTrigger value="reservas">Reservas</TabsTrigger>
            <TabsTrigger value="habitaciones">Habitaciones</TabsTrigger>
            <TabsTrigger value="tarifas">Tarifas</TabsTrigger>
          </TabsList>
          <Button onClick={() => setPrefill({})} disabled={rooms.length === 0}>
            <Plus className="mr-2 h-4 w-4" /> Nueva reserva
          </Button>
        </div>
        <TabsContent value="hoy" className="pt-4">
          <FrontDesk stays={stays} rooms={rooms} roomTypes={roomTypes} currency={currency} today={today} onOpen={open} />
        </TabsContent>
        <TabsContent value="calendario" className="pt-4">
          <TapeChart stays={stays} rooms={rooms} roomTypes={roomTypes} from={props.from} days={14} today={today} onOpen={open} onNew={setPrefill} />
        </TabsContent>
        <TabsContent value="reservas" className="pt-4">
          <StaysList stays={stays} rooms={rooms} roomTypes={roomTypes} currency={currency} today={today} onOpen={open} />
        </TabsContent>
        <TabsContent value="habitaciones" className="pt-4">
          <RoomsPanel businessId={businessId} roomTypes={roomTypes} rooms={rooms} isHostel={props.isHostel} />
        </TabsContent>
        <TabsContent value="tarifas" className="pt-4">
          <RatesPanel businessId={businessId} settings={props.settings} seasons={props.seasons} roomTypes={roomTypes} />
        </TabsContent>
      </Tabs>

      <StayDialog
        stay={openStay}
        onClose={() => setOpenId(null)}
        stays={stays}
        rooms={rooms}
        roomTypes={roomTypes}
        services={props.services}
        currency={currency}
        today={today}
        siteUrl={props.siteUrl}
        slug={props.slug}
      />
      <NewStayDialog
        prefill={prefill}
        onClose={() => setPrefill(null)}
        businessId={businessId}
        currency={currency}
        today={today}
        roomTypes={roomTypes}
        rooms={rooms}
        stays={stays}
        seasons={props.seasons}
        settings={props.settings}
      />
    </>
  );
}
