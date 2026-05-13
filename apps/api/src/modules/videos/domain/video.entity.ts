import { type VideoResolution } from "@app/shared";

export interface VideoDoc {
  author: string;
  availableResolutions: VideoResolution[];
  canBeDownloaded: boolean;
  createdAt: Date;
  id: number;
  minAgeRestriction: null | number;
  publicationDate: Date;
  title: string;
}
