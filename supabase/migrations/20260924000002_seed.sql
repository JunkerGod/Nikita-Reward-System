-- Starter activities and rewards. All of them can be edited in the app.

insert into public.activities (name, icon, points, category) values
  ('Drank enough water', 'drop', 5, 'small'),
  ('Went for a walk or workout', 'sneaker', 10, 'small'),
  ('Finished homework', 'notebook', 10, 'small'),
  ('Early night', 'moon', 5, 'small'),
  ('Did something kind', 'hand-heart', 10, 'small'),
  ('Studied for 2+ hours', 'books', 25, 'medium'),
  ('Finished an assignment', 'check-circle', 30, 'medium'),
  ('Cooked a meal', 'cooking-pot', 20, 'medium'),
  ('Tried something new', 'sparkle', 20, 'medium'),
  ('Good test result', 'exam', 50, 'big'),
  ('Handed in a major project', 'rocket', 75, 'big'),
  ('Hit a personal goal', 'trophy', 100, 'big');

-- Spread created_at so "newest" sorting is stable and none of the starters show the "New" tag.
insert into public.rewards (name, icon, price, description, created_at) values
  ('I pick the movie night film', 'film-slate', 50, null, now() - interval '7 days'),
  ('Favourite snack or bubble tea on me', 'coffee', 75, null, now() - interval '7 days' + interval '1 minute'),
  ('Handwritten letter', 'envelope-simple', 100, null, now() - interval '7 days' + interval '2 minutes'),
  ('Breakfast or dinner of your choice', 'fork-knife', 150, null, now() - interval '7 days' + interval '3 minutes'),
  ('Date day', 'calendar-heart', 250, 'You plan everything and I just show up', now() - interval '7 days' + interval '4 minutes'),
  ('Surprise gift', 'gift', 400, null, now() - interval '7 days' + interval '5 minutes');
