-- Two-slide promo banner shown on the mobile app's Home screen, above
-- the pill menu. Fixed at two slots (not a repeatable table) since the
-- mobile UI is a fixed 2-image 4:1 slider, not an arbitrary list.
alter table public.events
  add column banner_1_image_url text,
  add column banner_1_link_url text,
  add column banner_2_image_url text,
  add column banner_2_link_url text;
