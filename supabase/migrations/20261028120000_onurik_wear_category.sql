-- Onurik Wear: the studio's own clothing label, filed as its own Works category.
-- (Saving a project with a new category name also creates the row; this just orders it.)
insert into public.onurik_project_categories (name, sort_order)
select 'Onurik Wear', 4
where not exists (
  select 1 from public.onurik_project_categories
  where trim(lower(name)) = 'onurik wear'
);

update public.onurik_project_categories
set sort_order = 4
where trim(lower(name)) = 'onurik wear';
