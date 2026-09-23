import type { Tour } from "../types";
import { postjobTour } from "./postjob-tour";
import { notifyTour } from "./notify-tour";
import { candidatesTour } from "./candidates-tour";
import { referTour } from "./refer-tour";
import { shareTour } from "./share-tour";
import { moneyTour } from "./money-tour";
import { applicationsTour } from "./applications-tour";

export const TOURS: Tour[] = [
  postjobTour,
  notifyTour,
  candidatesTour,
  referTour,
  shareTour,
  moneyTour,
  applicationsTour,
];
