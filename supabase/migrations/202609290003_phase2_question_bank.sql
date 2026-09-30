alter table public.questions
  add column if not exists class_id uuid references public.classes (id) on delete set null,
  add column if not exists chapter text,
  add column if not exists topic text,
  add column if not exists difficulty text not null default 'medium';

alter table public.questions
  add constraint questions_difficulty_valid
  check (difficulty in ('easy', 'medium', 'hard'));

create index questions_class_subject_idx on public.questions (class_id, subject_id, status);
create index questions_owner_type_idx on public.questions (owner_teacher_id, question_type, difficulty);

drop policy if exists questions_teacher_manage on public.questions;
create policy questions_teacher_manage on public.questions for all to authenticated
using (
  owner_teacher_id = public.current_teacher_id()
  and (class_id is null or public.teacher_teaches_class(class_id))
)
with check (
  owner_teacher_id = public.current_teacher_id()
  and (class_id is null or public.teacher_teaches_class(class_id))
);