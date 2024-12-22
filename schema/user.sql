CREATE TABLE public.users
(
    id character varying(255) COLLATE pg_catalog."default" NOT NULL,
    handle character varying(255) COLLATE pg_catalog."default" NOT NULL,
    code character varying(255) COLLATE pg_catalog."default" NOT NULL,
    create_time timestamp with time zone NOT NULL,
    location character varying(255) COLLATE pg_catalog."default",
    CONSTRAINT user_pkey PRIMARY KEY (id)
    CONSTRAINT code UNIQUE (code)
);