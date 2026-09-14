/*
 * Drop real photography in here later.
 *
 * Image files live under public/photos/ and are referenced by URL path
 * (Vite serves the public/ folder as-is from the site root), not imported
 * as modules.
 *
 * Any key left as `null` falls back to the cinematic gradient placeholder
 * (see Visual.jsx) so the site works today and upgrades automatically
 * the moment a real image is wired in.
 *
 * Some photos also have a `_mobile` variant, pre-cropped/fitted for phone
 * screens. Visual() swaps to it below 768px via a <picture> media query;
 * entries without a mobile variant just keep using the desktop image.
 */
const hero = "/photos/firstphoto.png";
const heroMobile = "/photos/firstphoto_mobile.png";
const sleepingPerson = "/photos/sleeping.png";
const sleepingPersonMobile = "/photos/sleeping_mobile.png";
const running = "/photos/Running.png";
const runningMobile = "/photos/running_mobile.png";
const walking = "/photos/walking.png";
const walkingMobile = "/photos/walking_mobile.png";
const cycling = "/photos/cycling.png";
const cyclingMobile = "/photos/cycling_mobile.png";
const workout = "/photos/work.png";
const workoutMobile = "/photos/work_mobile.png";
const recoveryFitness = "/photos/youga.png";
const recoveryFitnessMobile = "/photos/youga_mobile.png";
const familyParent = "/photos/remotemonitering.png";
const familyParentMobile = "/photos/remotemonitering_mobile.png";
const exercisePhoto = "/photos/realworld to digital world.png";
const exercisePhotoMobile = "/photos/realworld to digital world_mobile.png";
const deviceFront = "/photos/front image.png";
const deviceSide = "/photos/sideview.png";
const deviceSensor = "/photos/sensor image.png";

const MEDIA = {
  hero,
  wearablePerson: null,
  wearableWrist: null,
  wearableBand: null,
  sleepingPerson,
  running,
  walking,
  cycling,
  workout,
  recoveryFitness,
  familyParent,
  exercisePhoto,
  familyChild: null,
  deviceFront,
  deviceSide,
  deviceSensor,
  deviceWrist: null,
  finalParent: null,
  finalYoungAdult: null,
  finalAthlete: null,
  finalFamily: null,
};

// Mobile-fitted counterparts, keyed the same as MEDIA. Only entries with an
// actual mobile photo are listed here.
export const MEDIA_MOBILE = {
  hero: heroMobile,
  sleepingPerson: sleepingPersonMobile,
  running: runningMobile,
  walking: walkingMobile,
  cycling: cyclingMobile,
  workout: workoutMobile,
  recoveryFitness: recoveryFitnessMobile,
  familyParent: familyParentMobile,
  exercisePhoto: exercisePhotoMobile,
};

export default MEDIA;
