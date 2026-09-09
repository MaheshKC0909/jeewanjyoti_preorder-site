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
 */
const hero = "/photos/firstphoto.png";
const sleepingPerson = "/photos/sleeping.png";
const running = "/photos/Running.png";
const walking = "/photos/walking.png";
const cycling = "/photos/cycling.png";
const workout = "/photos/work.png";
const recoveryFitness = "/photos/youga.png";
const familyParent = "/photos/remotemonitering.png";
const exercisePhoto = "/photos/realworld to digital world.png";
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

export default MEDIA;
