<?php

// Theme Setup - MUST be on after_setup_theme hook
function geek_theme_setup()
{
  // Enable featured images (post thumbnails)
  add_theme_support('post-thumbnails');

  // Set default thumbnail sizes
  add_image_size('blog-thumbnail', 300, 200, true); // For blog listing
  add_image_size('blog-featured', 900, 400, true);  // For single posts

  // Add title tag support
  add_theme_support('title-tag');

  // Add HTML5 support
  add_theme_support('html5', array('search-form', 'comment-form', 'comment-list', 'gallery', 'caption'));
}
add_action('after_setup_theme', 'geek_theme_setup');

// Enqueue Styles
function geek_enqueue_styles()
{
  // Geek site stylesheet — all pages
  wp_enqueue_style(
    'geek-elements-css',
    get_template_directory_uri() . '/assets/geek-elements/styles.css',
    array(),
    '1.0.0',
    'all'
  );

  // Get-Order-Stack stylesheet — OrderStack demo pages
  $orderstack_pages = array(
    'orderstack-server-ordering/',
    'orderstack-kds',
    'orderstack-menu-engineering',
    'orderstack-sales',
    'orderstack-inventory',
    'orderstack-menu-management',
    'orderstack-orders',
    'orderstack-online-ordering',
    'orderstack-reservations',
    'orderstack-command-center',
    'orderstack-floor-plan',
    'orderstack-crm',
    'orderstack-ai-chat',
    'orderstack-monitoring',
    'orderstack-voice-order',
    'orderstack-pricing',
    'orderstack-waste',
    'orderstack-sentiment',
  );
  if (is_page($orderstack_pages)) {
    wp_enqueue_style(
      'order-stack-elements-css',
      get_template_directory_uri() . '/assets/geek-elements/get-order-stack-elements/styles.css',
      array(),
      '1.2.0',
      'all'
    );
  }

  // ACORD PCS CRM stylesheet — demo pages only
  if (is_page('acord-pcs-demo')) {
    wp_enqueue_style(
      'crm-elements-css',
      get_template_directory_uri() . '/assets/geek-elements/acord-pcs-crm-elements/styles.css',
      array(),
      '1.0.0',
      'all'
    );
  }

  // ACORD LHA CRM stylesheet — demo pages only
  if (is_page('acord-lhs-demo')) {
    wp_enqueue_style(
      'lha-crm-elements-css',
      get_template_directory_uri() . '/assets/geek-elements/acord-lha-crm-elements/styles.css',
      array(),
      '1.0.0',
      'all'
    );
  }

  // RankPilot stylesheet — rankpilot page only
  if (is_page('rankpilot')) {
    wp_enqueue_style(
      'rankpilot-elements-css',
      get_template_directory_uri() . '/assets/geek-elements/rankpilot/styles.css',
      array(),
      '0.1.0',
      'all'
    );
  }
}
add_action('wp_enqueue_scripts', 'geek_enqueue_styles');

// Enqueue Script Modules — loaded with type="module" for scope isolation
// Each bundle is in its own directory since outputHashing: "none" produces main.js for all
function geek_enqueue_modules()
{
  // Geek site elements bundle — all pages
  wp_enqueue_script_module(
    'geek-elements',
    get_template_directory_uri() . '/assets/geek-elements/main.js',
    array(),
    '1.0.0'
  );

  // Get-Order-Stack elements bundle — OrderStack demo pages
  $orderstack_pages = array(
    'orderstack-server-ordering',
    'orderstack-kds',
    'orderstack-menu-engineering',
    'orderstack-sales',
    'orderstack-inventory',
    'orderstack-menu-management',
    'orderstack-orders',
    'orderstack-online-ordering',
    'orderstack-reservations',
    'orderstack-command-center',
    'orderstack-floor-plan',
    'orderstack-crm',
    'orderstack-ai-chat',
    'orderstack-monitoring',
    'orderstack-voice-order',
    'orderstack-pricing',
    'orderstack-waste',
    'orderstack-sentiment',
  );
  if (is_page($orderstack_pages)) {
    wp_enqueue_script_module(
      'order-stack-elements',
      get_template_directory_uri() . '/assets/geek-elements/get-order-stack-elements/main.js',
      array(),
      '1.2.0'
    );
  }

  // ACORD PCS CRM elements bundle — demo pages only
  if (is_page('acord-pcs-demo')) {
    wp_enqueue_script_module(
      'crm-elements',
      get_template_directory_uri() . '/assets/geek-elements/acord-pcs-crm-elements/main.js',
      array(),
      '1.0.0'
    );
  }

  // ACORD LHA CRM elements bundle — demo pages only
  if (is_page('acord-lhs-demo')) {
    wp_enqueue_script_module(
      'lha-crm-elements',
      get_template_directory_uri() . '/assets/geek-elements/acord-lha-crm-elements/main.js',
      array(),
      '1.0.0'
    );
  }

  // RankPilot elements bundle — rankpilot page only
  if (is_page('rankpilot')) {
    wp_enqueue_script_module(
      'rankpilot-elements',
      get_template_directory_uri() . '/assets/geek-elements/rankpilot/main.js',
      array(),
      '0.7.0'
    );
  }
}
add_action('wp_enqueue_scripts', 'geek_enqueue_modules');
