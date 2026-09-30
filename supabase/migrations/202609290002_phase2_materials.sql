alter table public.materials
  add column if not exists file_name text,
  add column if not exists file_mime_type text,
  add column if not exists file_size_bytes bigint;

alter table public.materials
  add constraint materials_file_size_nonnegative
  check (file_size_bytes is null or file_size_bytes > 0);

drop policy if exists materials_storage_read on storage.objects;
drop policy if exists materials_storage_teacher_insert on storage.objects;
drop policy if exists materials_storage_teacher_delete on storage.objects;
drop policy if exists materials_storage_teacher_update on storage.objects;

create policy materials_storage_read on storage.objects for select to authenticated using (
  bucket_id = 'materials' and exists (
    select 1 from public.materials m
    where m.storage_path = storage.objects.name and (
      (m.status = 'published' and public.student_in_class(m.class_id))
      or (public.teacher_teaches_class(m.class_id) and (
        m.teacher_id = public.current_teacher_id() or public.is_developer()
      ))
    )
  )
);

create policy materials_storage_teacher_insert on storage.objects for insert to authenticated with check (
  bucket_id = 'materials'
  and (storage.foldername(name))[2] = public.current_teacher_id()::text
  and exists (
    select 1 from public.classes c
    where c.id::text = (storage.foldername(name))[1] and public.teacher_teaches_class(c.id)
  )
);

create policy materials_storage_teacher_update on storage.objects for update to authenticated
using (
  bucket_id = 'materials' and exists (
    select 1 from public.materials m where m.storage_path = storage.objects.name
      and (m.teacher_id = public.current_teacher_id() or public.is_developer())
  )
)
with check (
  bucket_id = 'materials' and exists (
    select 1 from public.materials m where m.storage_path = storage.objects.name
      and (m.teacher_id = public.current_teacher_id() or public.is_developer())
  )
);

create policy materials_storage_teacher_delete on storage.objects for delete to authenticated using (
  bucket_id = 'materials' and exists (
    select 1 from public.materials m where m.storage_path = storage.objects.name
      and (m.teacher_id = public.current_teacher_id() or public.is_developer())
  )
);