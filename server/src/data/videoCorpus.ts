/**
 * Short Creative Commons videos from Wikimedia Commons.
 * Posters are hashed for perceptual search; `fileUrl` is what the player loads.
 */
export interface VideoSeed {
  id: string;
  title: string;
  fileUrl: string;
  thumbUrl: string;
  source: string;
  license: 'public_domain' | 'creative_commons';
}

export const VIDEO_SEEDS: VideoSeed[] = [
  {
    id: 'vid-cat',
    title: 'Cat lapping water',
    fileUrl:
      'https://upload.wikimedia.org/wikipedia/commons/a/ac/Cat_lapping_water_off_ground_in_slow_motion.gk.webm',
    thumbUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ac/Cat_lapping_water_off_ground_in_slow_motion.gk.webm/500px--Cat_lapping_water_off_ground_in_slow_motion.gk.webm.jpg',
    source: 'Wikimedia',
    license: 'creative_commons',
  },
  {
    id: 'vid-coffee',
    title: 'A cup of Kenyan coffee',
    fileUrl: 'https://upload.wikimedia.org/wikipedia/commons/5/5f/A_cup_of_Kenyan_Coffee.webm',
    thumbUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5f/A_cup_of_Kenyan_Coffee.webm/500px--A_cup_of_Kenyan_Coffee.webm.jpg',
    source: 'Wikimedia',
    license: 'creative_commons',
  },
  {
    id: 'vid-beach',
    title: 'Beach in Carrascal',
    fileUrl: 'https://upload.wikimedia.org/wikipedia/commons/7/7f/Beach_in_Carrascal.webm',
    thumbUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7f/Beach_in_Carrascal.webm/500px--Beach_in_Carrascal.webm.jpg',
    source: 'Wikimedia',
    license: 'creative_commons',
  },
  {
    id: 'vid-bird',
    title: 'Bird drinking water',
    fileUrl:
      'https://upload.wikimedia.org/wikipedia/commons/2/22/Cute_Bird_Drinking_Water_from_Bottle_Cap_offered_by_Woman.webm',
    thumbUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/Cute_Bird_Drinking_Water_from_Bottle_Cap_offered_by_Woman.webm/500px--Cute_Bird_Drinking_Water_from_Bottle_Cap_offered_by_Woman.webm.jpg',
    source: 'Wikimedia',
    license: 'creative_commons',
  },
  {
    id: 'vid-sunset',
    title: "Sunset at Cox's Bazar",
    fileUrl:
      'https://upload.wikimedia.org/wikipedia/commons/f/fd/Sunset_view_of_Cox%27s_Bazar_beach%2C_Bangladesh.webm',
    thumbUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fd/Sunset_view_of_Cox%27s_Bazar_beach%2C_Bangladesh.webm/500px--Sunset_view_of_Cox%27s_Bazar_beach%2C_Bangladesh.webm.jpg',
    source: 'Wikimedia',
    license: 'creative_commons',
  },
  {
    id: 'vid-train',
    title: 'Train passing Liminka',
    fileUrl: 'https://upload.wikimedia.org/wikipedia/commons/6/6a/Train_passing_liminka_station.webm',
    thumbUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6a/Train_passing_liminka_station.webm/500px--Train_passing_liminka_station.webm.jpg',
    source: 'Wikimedia',
    license: 'creative_commons',
  },
  {
    id: 'vid-bike',
    title: 'Racing bicycle',
    fileUrl:
      'https://upload.wikimedia.org/wikipedia/commons/1/1a/Man_on_racing_bicycle_driving_on_side_of_rowing_venue_Regattastrecke_Oberschlei%C3%9Fheim_near_Munich%2C_Germany.webm',
    thumbUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Man_on_racing_bicycle_driving_on_side_of_rowing_venue_Regattastrecke_Oberschlei%C3%9Fheim_near_Munich%2C_Germany.webm/500px--Man_on_racing_bicycle_driving_on_side_of_rowing_venue_Regattastrecke_Oberschlei%C3%9Fheim_near_Munich%2C_Germany.webm.jpg',
    source: 'Wikimedia',
    license: 'creative_commons',
  },
  {
    id: 'vid-flower',
    title: 'Peony blooming',
    fileUrl: 'https://upload.wikimedia.org/wikipedia/commons/b/b4/Time_lapse_of_Peony_flower_blooming.webm',
    thumbUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b4/Time_lapse_of_Peony_flower_blooming.webm/500px--Time_lapse_of_Peony_flower_blooming.webm.jpg',
    source: 'Wikimedia',
    license: 'creative_commons',
  },
  {
    id: 'vid-city',
    title: 'Dubai skyline',
    fileUrl: 'https://upload.wikimedia.org/wikipedia/commons/7/70/Dubai_skyline_2013.webm',
    thumbUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/7/70/Dubai_skyline_2013.webm/500px--Dubai_skyline_2013.webm.jpg',
    source: 'Wikimedia',
    license: 'creative_commons',
  },
];
