
-- Use the `ref` function to select from other models

{{ config(materialized='table') }}
select count(*)
from {{ source('main', 'adversaries_dim') }}
