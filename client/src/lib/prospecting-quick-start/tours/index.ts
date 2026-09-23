import type { Tour } from "../types";
import { findProspectTour } from "./find-prospect-tour";
import { trackRequestTour } from "./track-request-tour";
import { fulfillRequestTour } from "./fulfill-request-tour";
import { shareOpportunityTour } from "./share-opportunity-tour";
import { transactionsTour } from "./transactions-tour";

export const TOURS: Tour[] = [
  findProspectTour,
  trackRequestTour,
  fulfillRequestTour,
  shareOpportunityTour,
  transactionsTour,
];
