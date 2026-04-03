-- Add back_cover_url and back_cover_text to books table
do $$ 
begin
  if not exists (select from information_schema.columns where table_name = 'books' and column_name = 'back_cover_url') then
    alter table public.books add column back_cover_url text;
  end if;
  
  if not exists (select from information_schema.columns where table_name = 'books' and column_name = 'back_cover_text') then
    alter table public.books add column back_cover_text text;
  end if;
end $$;
