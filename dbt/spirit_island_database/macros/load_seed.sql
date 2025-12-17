{% macro load_seed(seed_file) %}

-- TODO: change select clause to take specific names (e.g. spirit_id) and make them generic (e.g. id)
  {% set query %}
    SELECT * FROM {{ seed_file }}
  {% endset %}

  {% set results = run_query(query) %}

  {{ return(results) }}

{% endmacro %}