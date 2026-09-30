create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text not null default '',
  role text not null default 'MURID' check (role in ('DEVELOPER', 'GURU', 'MURID')),
  status text not null default 'active' check (status in ('active', 'pending', 'disabled')),
  phone text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index profiles_email_lower_unique on public.profiles (lower(email)) where email is not null;

create table public.academic_years (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  starts_on date not null,
  ends_on date not null,
  status text not null default 'planned' check (status in ('planned', 'active', 'completed', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_on > starts_on)
);

create table public.teachers (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles (id) on delete cascade,
  employee_number text unique,
  department text,
  employment_status text not null default 'active' check (employment_status in ('active', 'inactive', 'leave')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.classes (
  id uuid primary key default gen_random_uuid(),
  academic_year_id uuid not null references public.academic_years (id) on delete restrict,
  name text not null,
  grade_level smallint not null check (grade_level between 10 and 12),
  homeroom_teacher_id uuid references public.teachers (id) on delete set null,
  status text not null default 'active' check (status in ('active', 'inactive', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (academic_year_id, name)
);

create table public.class_teachers (
  class_id uuid not null references public.classes (id) on delete cascade,
  teacher_id uuid not null references public.teachers (id) on delete cascade,
  assigned_at timestamptz not null default now(),
  primary key (class_id, teacher_id)
);

create table public.students (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles (id) on delete cascade,
  class_id uuid references public.classes (id) on delete set null,
  student_number text unique,
  enrollment_status text not null default 'active' check (enrollment_status in ('active', 'graduated', 'transferred', 'inactive')),
  enrolled_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null unique,
  description text,
  status text not null default 'active' check (status in ('active', 'inactive', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.schedules (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id) on delete cascade,
  subject_id uuid not null references public.subjects (id) on delete restrict,
  teacher_id uuid not null references public.teachers (id) on delete restrict,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  room text,
  status text not null default 'scheduled' check (status in ('scheduled', 'cancelled', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create table public.materials (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id) on delete cascade,
  subject_id uuid references public.subjects (id) on delete set null,
  teacher_id uuid not null references public.teachers (id) on delete restrict,
  title text not null,
  description text,
  storage_path text,
  external_url text,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (storage_path is not null or external_url is not null)
);

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  owner_teacher_id uuid not null references public.teachers (id) on delete restrict,
  subject_id uuid not null references public.subjects (id) on delete restrict,
  question_type text not null check (question_type in ('multiple_choice', 'short_answer', 'essay', 'true_false')),
  prompt text not null,
  options jsonb not null default '[]'::jsonb,
  image_path text,
  default_points numeric(7,2) not null default 1 check (default_points > 0),
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.question_keys (
  question_id uuid primary key references public.questions (id) on delete cascade,
  answer_key jsonb,
  explanation text,
  updated_at timestamptz not null default now()
);

create table public.question_bank (
  id uuid primary key default gen_random_uuid(),
  owner_teacher_id uuid not null references public.teachers (id) on delete cascade,
  question_id uuid not null references public.questions (id) on delete cascade,
  visibility text not null default 'private' check (visibility in ('private', 'shared', 'school')),
  created_at timestamptz not null default now(),
  unique (owner_teacher_id, question_id)
);

create table public.exams (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id) on delete cascade,
  subject_id uuid not null references public.subjects (id) on delete restrict,
  teacher_id uuid not null references public.teachers (id) on delete restrict,
  title text not null,
  instructions text,
  starts_at timestamptz,
  ends_at timestamptz,
  duration_minutes integer check (duration_minutes is null or duration_minutes between 1 and 600),
  status text not null default 'draft' check (status in ('draft', 'published', 'open', 'closed', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);

create table public.exam_questions (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams (id) on delete cascade,
  question_id uuid not null references public.questions (id) on delete restrict,
  position integer not null check (position > 0),
  points numeric(7,2) not null check (points > 0),
  unique (exam_id, position),
  unique (exam_id, question_id)
);

create table public.exam_attempts (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams (id) on delete restrict,
  student_id uuid not null references public.students (id) on delete cascade,
  attempt_number smallint not null default 1 check (attempt_number > 0),
  status text not null default 'in_progress' check (status in ('in_progress', 'submitted', 'graded', 'voided')),
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  score numeric(8,2) check (score is null or score >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (exam_id, student_id, attempt_number)
);

create table public.answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.exam_attempts (id) on delete cascade,
  exam_question_id uuid not null references public.exam_questions (id) on delete restrict,
  response jsonb,
  answered_at timestamptz,
  awarded_points numeric(7,2) check (awarded_points is null or awarded_points >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (attempt_id, exam_question_id)
);

create table public.grades (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  class_id uuid not null references public.classes (id) on delete cascade,
  subject_id uuid not null references public.subjects (id) on delete restrict,
  exam_id uuid references public.exams (id) on delete set null,
  recorded_by uuid not null references public.teachers (id) on delete restrict,
  score numeric(7,2) not null check (score between 0 and 100),
  assessment_name text not null,
  status text not null default 'draft' check (status in ('draft', 'published', 'voided')),
  recorded_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.attendance (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  schedule_id uuid references public.schedules (id) on delete set null,
  attendance_date date not null,
  status text not null check (status in ('present', 'late', 'excused', 'sick', 'absent')),
  note text,
  recorded_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (class_id, student_id, attendance_date, schedule_id)
);

create table public.attendance_logs (
  id uuid primary key default gen_random_uuid(),
  attendance_id uuid not null references public.attendance (id) on delete cascade,
  actor_id uuid not null references public.profiles (id) on delete restrict,
  action text not null check (action in ('created', 'updated', 'deleted')),
  previous_value jsonb,
  new_value jsonb,
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  body text not null,
  category text not null default 'general' check (category in ('general', 'academic', 'security', 'system')),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.exam_security_logs (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.exam_attempts (id) on delete cascade,
  event_type text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.system_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
  resource_type text,
  resource_id uuid,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.ai_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles (id) on delete set null,
  operation text not null,
  model_name text,
  status text not null check (status in ('succeeded', 'failed', 'blocked')),
  input_tokens integer check (input_tokens is null or input_tokens >= 0),
  output_tokens integer check (output_tokens is null or output_tokens >= 0),
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index classes_year_status_idx on public.classes (academic_year_id, status);
create index class_teachers_teacher_idx on public.class_teachers (teacher_id, class_id);
create index students_class_status_idx on public.students (class_id, enrollment_status);
create index schedules_class_starts_idx on public.schedules (class_id, starts_at);
create index materials_class_status_idx on public.materials (class_id, status);
create index questions_owner_subject_idx on public.questions (owner_teacher_id, subject_id);
create index exams_class_status_idx on public.exams (class_id, status);
create index exam_attempts_student_idx on public.exam_attempts (student_id, created_at desc);
create index grades_student_idx on public.grades (student_id, status, recorded_at desc);
create index attendance_student_date_idx on public.attendance (student_id, attendance_date desc);
create index notifications_recipient_idx on public.notifications (recipient_id, created_at desc);
create index system_logs_created_idx on public.system_logs (created_at desc);
create index ai_logs_actor_created_idx on public.ai_logs (actor_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  target_table text;
begin
  foreach target_table in array array[
    'profiles', 'academic_years', 'teachers', 'classes', 'students', 'subjects',
    'schedules', 'materials', 'questions', 'question_keys', 'question_bank',
    'exams', 'exam_questions', 'exam_attempts', 'answers', 'grades', 'attendance',
    'attendance_logs', 'notifications', 'exam_security_logs', 'system_logs', 'ai_logs'
  ] loop
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and information_schema.columns.table_name = target_table and column_name = 'updated_at'
    ) then
      execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()', target_table);
    end if;
  end loop;
end;
$$;

create or replace function public.current_role()
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select role from public.profiles where id = auth.uid() and status = 'active'
$$;

create or replace function public.is_developer()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(public.current_role() = 'DEVELOPER', false)
$$;

create or replace function public.current_teacher_id()
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select id from public.teachers where profile_id = auth.uid() and employment_status = 'active'
$$;

create or replace function public.current_student_id()
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select id from public.students where profile_id = auth.uid() and enrollment_status = 'active'
$$;

create or replace function public.teacher_teaches_class(target_class_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.is_developer() or exists (
    select 1 from public.class_teachers ct
    where ct.class_id = target_class_id and ct.teacher_id = public.current_teacher_id()
  ) or exists (
    select 1 from public.classes c
    where c.id = target_class_id and c.homeroom_teacher_id = public.current_teacher_id()
  )
$$;

create or replace function public.student_in_class(target_class_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.students s
    where s.id = public.current_student_id() and s.class_id = target_class_id
  )
$$;

create or replace function public.can_access_exam(target_exam_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.is_developer() or exists (
    select 1 from public.exams e
    where e.id = target_exam_id and (
      public.teacher_teaches_class(e.class_id)
      or (e.status in ('published', 'open', 'closed') and public.student_in_class(e.class_id))
    )
  )
$$;

create or replace function public.bootstrap_profile()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), ''),
    'MURID'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.bootstrap_profile();

create or replace function public.prevent_self_role_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() = old.id and auth.role() <> 'service_role' and not public.is_developer()
    and (new.role is distinct from old.role or new.status is distinct from old.status) then
    raise exception 'Role dan status hanya dapat diubah melalui manajemen akun berwenang.' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger protect_profile_role before update on public.profiles
for each row execute function public.prevent_self_role_change();

grant usage on schema public to authenticated;
grant usage on schema public to service_role;
grant all privileges on all tables in schema public to service_role;
grant select on public.profiles to authenticated;
grant select on public.academic_years, public.teachers, public.classes, public.class_teachers,
  public.students, public.subjects, public.schedules, public.materials, public.questions,
  public.question_bank, public.exams, public.exam_questions, public.exam_attempts,
  public.answers, public.grades, public.attendance, public.attendance_logs,
  public.notifications, public.exam_security_logs, public.system_logs, public.ai_logs to authenticated;
grant insert, update, delete on public.academic_years to authenticated;
grant insert, update, delete on public.teachers, public.classes, public.class_teachers,
  public.students, public.subjects, public.schedules, public.materials, public.questions,
  public.question_keys, public.question_bank, public.exams, public.exam_questions,
  public.exam_attempts, public.answers, public.grades, public.attendance to authenticated;
grant select, insert, update, delete on public.question_keys to authenticated;
grant update (read_at) on public.notifications to authenticated;
revoke insert, update on public.exam_attempts from authenticated;
grant insert (exam_id, student_id) on public.exam_attempts to authenticated;
grant update (status, submitted_at) on public.exam_attempts to authenticated;
revoke insert, update on public.answers from authenticated;
grant insert (attempt_id, exam_question_id, response, answered_at) on public.answers to authenticated;
grant update (response, answered_at) on public.answers to authenticated;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'profiles', 'academic_years', 'teachers', 'classes', 'class_teachers', 'students',
    'subjects', 'schedules', 'materials', 'questions', 'question_keys', 'question_bank',
    'exams', 'exam_questions', 'exam_attempts', 'answers', 'grades', 'attendance',
    'attendance_logs', 'notifications', 'exam_security_logs', 'system_logs', 'ai_logs'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format(
      'create policy developer_all on public.%I for all to authenticated using (public.is_developer()) with check (public.is_developer())',
      table_name
    );
  end loop;
end;
$$;

create policy profiles_read_self on public.profiles for select to authenticated using (id = auth.uid());

create policy academic_years_read_active on public.academic_years for select to authenticated using (status = 'active');

create policy teachers_read_self on public.teachers for select to authenticated using (profile_id = auth.uid());
create policy students_read_related on public.students for select to authenticated using (
  profile_id = auth.uid() or (class_id is not null and public.teacher_teaches_class(class_id))
);

create policy classes_read_related on public.classes for select to authenticated using (
  public.teacher_teaches_class(id) or public.student_in_class(id)
);
create policy class_teachers_read_related on public.class_teachers for select to authenticated using (
  public.teacher_teaches_class(class_id) or public.student_in_class(class_id)
);

create policy subjects_read_active on public.subjects for select to authenticated using (status = 'active');

create policy schedules_read_related on public.schedules for select to authenticated using (
  public.teacher_teaches_class(class_id) or public.student_in_class(class_id)
);
create policy schedules_teacher_manage on public.schedules for all to authenticated
using (public.teacher_teaches_class(class_id)) with check (public.teacher_teaches_class(class_id));

create policy materials_read_related on public.materials for select to authenticated using (
  (status = 'published' and public.student_in_class(class_id)) or public.teacher_teaches_class(class_id)
);
create policy materials_teacher_manage on public.materials for all to authenticated
using (public.teacher_teaches_class(class_id) and teacher_id = public.current_teacher_id())
with check (public.teacher_teaches_class(class_id) and teacher_id = public.current_teacher_id());

create policy questions_teacher_manage on public.questions for all to authenticated
using (owner_teacher_id = public.current_teacher_id())
with check (owner_teacher_id = public.current_teacher_id());
create policy questions_shared_teacher_read on public.questions for select to authenticated using (
  public.current_role() = 'GURU' and exists (
    select 1 from public.question_bank qb
    where qb.question_id = id and qb.visibility in ('shared', 'school')
  )
);
create policy questions_read_for_exam on public.questions for select to authenticated using (
  exists (
    select 1 from public.exam_questions eq join public.exams e on e.id = eq.exam_id
    where eq.question_id = id and (
      public.teacher_teaches_class(e.class_id)
      or (e.status in ('published', 'open', 'closed') and public.student_in_class(e.class_id))
    )
  )
);
create policy question_keys_teacher_manage on public.question_keys for all to authenticated
using (exists (select 1 from public.questions q where q.id = question_id and q.owner_teacher_id = public.current_teacher_id()) or exists (
  select 1 from public.question_bank qb where qb.question_id = question_id and qb.visibility in ('shared', 'school')
))
with check (exists (select 1 from public.questions q where q.id = question_id and q.owner_teacher_id = public.current_teacher_id()));
create policy question_bank_teacher_manage on public.question_bank for all to authenticated
using (owner_teacher_id = public.current_teacher_id())
with check (owner_teacher_id = public.current_teacher_id());
create policy question_bank_shared_read on public.question_bank for select to authenticated using (
  public.current_role() = 'GURU' and visibility in ('shared', 'school')
);

create policy exams_read_related on public.exams for select to authenticated using (
  public.teacher_teaches_class(class_id)
  or (status in ('published', 'open', 'closed') and public.student_in_class(class_id))
);
create policy exams_teacher_manage on public.exams for all to authenticated
using (public.teacher_teaches_class(class_id) and teacher_id = public.current_teacher_id())
with check (public.teacher_teaches_class(class_id) and teacher_id = public.current_teacher_id());

create policy exam_questions_read_authorized on public.exam_questions for select to authenticated using (public.can_access_exam(exam_id));
create policy exam_questions_teacher_manage on public.exam_questions for all to authenticated
using (exists (select 1 from public.exams e where e.id = exam_id and public.teacher_teaches_class(e.class_id) and e.teacher_id = public.current_teacher_id()))
with check (
  exists (select 1 from public.exams e where e.id = exam_id and public.teacher_teaches_class(e.class_id) and e.teacher_id = public.current_teacher_id())
  and exists (select 1 from public.questions q where q.id = question_id and (
    q.owner_teacher_id = public.current_teacher_id() or exists (
      select 1 from public.question_bank qb where qb.question_id = q.id and qb.visibility in ('shared', 'school')
    )
  ))
);

create policy attempts_read_owner_or_teacher on public.exam_attempts for select to authenticated using (
  student_id = public.current_student_id() or exists (
    select 1 from public.exams e where e.id = exam_id and public.teacher_teaches_class(e.class_id)
  )
);
create policy attempts_student_start on public.exam_attempts for insert to authenticated with check (
  student_id = public.current_student_id() and exists (
    select 1 from public.exams e where e.id = exam_id and e.status = 'open' and public.student_in_class(e.class_id)
  )
);

create policy answers_read_authorized on public.answers for select to authenticated using (
  exists (select 1 from public.exam_attempts a where a.id = attempt_id and (
    a.student_id = public.current_student_id() or exists (
      select 1 from public.exams e where e.id = a.exam_id and public.teacher_teaches_class(e.class_id)
    )
  ))
);
create policy answers_student_write on public.answers for insert to authenticated with check (
  exists (select 1 from public.exam_attempts a join public.exam_questions eq on eq.exam_id = a.exam_id
    where a.id = attempt_id and eq.id = exam_question_id and a.student_id = public.current_student_id() and a.status = 'in_progress')
);
create policy answers_student_update on public.answers for update to authenticated
using (exists (select 1 from public.exam_attempts a join public.exam_questions eq on eq.exam_id = a.exam_id
  where a.id = attempt_id and eq.id = exam_question_id and a.student_id = public.current_student_id() and a.status = 'in_progress'))
with check (exists (select 1 from public.exam_attempts a join public.exam_questions eq on eq.exam_id = a.exam_id
  where a.id = attempt_id and eq.id = exam_question_id and a.student_id = public.current_student_id() and a.status = 'in_progress'));

create policy grades_read_related on public.grades for select to authenticated using (
  (student_id = public.current_student_id() and status = 'published')
  or public.teacher_teaches_class(class_id)
);
create policy grades_teacher_manage on public.grades for all to authenticated
using (public.teacher_teaches_class(class_id) and recorded_by = public.current_teacher_id() and exists (
  select 1 from public.students s where s.id = public.grades.student_id and s.class_id = public.grades.class_id
))
with check (public.teacher_teaches_class(class_id) and recorded_by = public.current_teacher_id() and exists (
  select 1 from public.students s where s.id = public.grades.student_id and s.class_id = public.grades.class_id
));

create policy attendance_read_related on public.attendance for select to authenticated using (
  student_id = public.current_student_id() or public.teacher_teaches_class(class_id)
);
create policy attendance_teacher_manage on public.attendance for all to authenticated
using (public.teacher_teaches_class(class_id) and recorded_by = auth.uid() and exists (
  select 1 from public.students s where s.id = public.attendance.student_id and s.class_id = public.attendance.class_id
))
with check (public.teacher_teaches_class(class_id) and recorded_by = auth.uid() and exists (
  select 1 from public.students s where s.id = public.attendance.student_id and s.class_id = public.attendance.class_id
));
create policy attendance_logs_read_related on public.attendance_logs for select to authenticated using (
  exists (select 1 from public.attendance a where a.id = attendance_id and (a.student_id = public.current_student_id() or public.teacher_teaches_class(a.class_id)))
);

create policy notifications_read_self on public.notifications for select to authenticated using (recipient_id = auth.uid());
create policy notifications_update_self on public.notifications for update to authenticated using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());

create policy exam_security_logs_read_related on public.exam_security_logs for select to authenticated using (
  exists (select 1 from public.exam_attempts a where a.id = attempt_id and (a.student_id = public.current_student_id() or exists (
    select 1 from public.exams e where e.id = a.exam_id and public.teacher_teaches_class(e.class_id)
  )))
);

create policy system_logs_developer_read on public.system_logs for select to authenticated using (public.is_developer());
create policy ai_logs_developer_read on public.ai_logs for select to authenticated using (public.is_developer());

insert into storage.buckets (id, name, public, file_size_limit)
values
  ('materials', 'materials', false, 52428800),
  ('question-images', 'question-images', false, 10485760),
  ('answer-sheets', 'answer-sheets', false, 52428800),
  ('avatars', 'avatars', false, 5242880)
on conflict (id) do update set public = false;

create policy materials_storage_read on storage.objects for select to authenticated using (
  bucket_id = 'materials' and exists (
    select 1 from public.classes c where c.id::text = (storage.foldername(name))[1]
      and (public.teacher_teaches_class(c.id) or public.student_in_class(c.id))
  )
);
create policy materials_storage_teacher_insert on storage.objects for insert to authenticated with check (
  bucket_id = 'materials' and exists (
    select 1 from public.classes c where c.id::text = (storage.foldername(name))[1] and public.teacher_teaches_class(c.id)
  )
);
create policy materials_storage_teacher_delete on storage.objects for delete to authenticated using (
  bucket_id = 'materials' and exists (
    select 1 from public.classes c where c.id::text = (storage.foldername(name))[1] and public.teacher_teaches_class(c.id)
  )
);

create policy question_images_storage_read on storage.objects for select to authenticated using (
  bucket_id = 'question-images' and (
    (storage.foldername(name))[1] = auth.uid()::text or public.is_developer() or exists (
      select 1 from public.questions q join public.exam_questions eq on eq.question_id = q.id
      join public.exams e on e.id = eq.exam_id
      where q.image_path = name and (
        public.teacher_teaches_class(e.class_id)
        or (e.status in ('published', 'open', 'closed') and public.student_in_class(e.class_id))
      )
    )
  )
);
create policy question_images_storage_insert on storage.objects for insert to authenticated with check (
  bucket_id = 'question-images' and (storage.foldername(name))[1] = auth.uid()::text
);
create policy question_images_storage_delete on storage.objects for delete to authenticated using (
  bucket_id = 'question-images' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_developer())
);

create policy answer_sheets_storage_read on storage.objects for select to authenticated using (
  bucket_id = 'answer-sheets' and (
    (storage.foldername(name))[1] = auth.uid()::text or public.is_developer() or exists (
      select 1 from public.students s join public.class_teachers ct on ct.class_id = s.class_id
      join public.teachers t on t.id = ct.teacher_id
      where s.profile_id::text = (storage.foldername(name))[1] and t.profile_id = auth.uid()
    )
  )
);
create policy answer_sheets_storage_insert on storage.objects for insert to authenticated with check (
  bucket_id = 'answer-sheets' and (storage.foldername(name))[1] = auth.uid()::text
);
create policy answer_sheets_storage_delete on storage.objects for delete to authenticated using (
  bucket_id = 'answer-sheets' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_developer())
);

create policy avatars_storage_read on storage.objects for select to authenticated using (bucket_id = 'avatars');
create policy avatars_storage_insert on storage.objects for insert to authenticated with check (
  bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
);
create policy avatars_storage_update on storage.objects for update to authenticated using (
  bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
) with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy avatars_storage_delete on storage.objects for delete to authenticated using (
  bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
);
create policy attempts_student_submit on public.exam_attempts for update to authenticated
using (student_id = public.current_student_id() and status = 'in_progress')
with check (student_id = public.current_student_id() and status = 'submitted');