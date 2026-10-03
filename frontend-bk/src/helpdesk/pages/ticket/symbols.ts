import { InjectionKey } from "vue";
import { Resource, Ticket } from "@/helpdesk/types";

export const ITicket: InjectionKey<Resource<Ticket>> = Symbol("Ticket");
