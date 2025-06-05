$(function () {
  var breadCrumbs = {
    'Aviation Channeling': {
      names: ['About DAC', 'Why Switch', 'Our Customers'],
      hrefs: [
        'solutions/aviation-channeling/about-dac/',
        'solutions/aviation-channeling/why-switch',
        'solutions/aviation-channeling/customers',
      ],
    },
    'Fingerprint Services': {
      names: [
        'FBI Channeling',
        'Comprehensive Managed Service',
        'Florida Department of Law Enforcement (FDLE)',
      ],
      hrefs: [
        'solutions/fingerprint-services/about/',
        'solutions/fingerprint-services/comprehensive-managed-service/',
        'solutions/fingerprint-services/florida-law-enforcement/',
      ],
      subMenu: {
        'FBI Channeling': {
          names: ['Individual Background Check', 'Organizational Employee Backgroubd Checks'],
          hrefs: [
            'solutions/fingerprint-services/fbi-channeling/individual',
            'solutions/fingerprint-services/fbi-channeling/organizational',
          ],
        },
        // 'Comprehensive Managed Service': {
        // 	names: ['Individual Background Check', 'Organizational Employee Backgroubd Checks'],
        // 	hrefs: ['solutions/fingerprint-services/fbi-channeling/individual', 'solutions/fingerprint-services/fbi-channeling/organizational']
        // }
      },
    },
    'Infastructure Services': {
      names: ['What is IDINFRA?', 'Technologies'],
      hrefs: [
        'solutions/identity-infastructure/about/',
        'solutions/identity-infastructure/technologies/',
      ],
    },
  };

  function makeBreadcrumbs(target) {
    var names = breadCrumbs[target].names;
    var hrefs = breadCrumbs[target].hrefs;

    var $breadCrumbMain = $('.breadcrumb-main-link');
    var $breadCrumbLinks = $('.breadcrumb-links');

    $('.breadcrumb-nav').removeClass('js-close');
    $('.breadcrumb-nav').addClass('js-open');
    $('.nested-nav').fadeOut();

    $breadCrumbMain.text('');
    $breadCrumbLinks.text('');

    $.each(names, function (index, name) {
      var $li = '';

      if ('subMenu' in breadCrumbs[target]) {
        var subMenuKeys = Object.keys(breadCrumbs[target].subMenu);
        var subMenuKey = subMenuKeys[index];
      }

      if (name === subMenuKey) {
        var $nestedLi = $('<li class="breadcrumb-link"></li>');
        var $nestedLink = '';
        buildNestedNav(subMenuKey, target, hrefs, name, index, $nestedLi, $nestedLink);
        $breadCrumbLinks.append($nestedLi);
      } else {
        $li +=
          '<li class="breadcrumb-link">' +
          '<a href=' +
          hrefs[index] +
          ' target="_self" class="top-link breadcrumb-top-link">' +
          name +
          '</a>' +
          '</li>';
      }
      $breadCrumbLinks.append($li);
    });

    $breadCrumbMain.text(target);
  }

  function makeNestedUl(subMenuNames, subMenuHrefs) {
    var $ul = $('<ul class="nested-nav level-2 breadcrumb-nested-nav js-hover"></ul>');

    $.each(subMenuNames, function (index, subMenuName) {
      var $li = '';

      $li +=
        '<li class="breadcrumb-link">' +
        '<a href=' +
        subMenuHrefs[index] +
        ' target="_self">' +
        subMenuName +
        '</a>' +
        '</li>';

      $ul.append($li);
    });

    return $ul[0];
  }

  function buildNestedNav(subMenuKey, target, hrefs, name, index, $nestedLi, $nestedLink) {
    console.log('subMenuKey', subMenuKey);

    var subMenuNames = breadCrumbs[target].subMenu[subMenuKey].names;
    var subMenuHrefs = breadCrumbs[target].subMenu[subMenuKey].hrefs;

    console.log('name', subMenuNames);
    console.log('href', subMenuHrefs);

    var $submenuNav = makeNestedUl(subMenuNames, subMenuHrefs);

    console.log('SubMenNav', $submenuNav);

    $nestedLink += '<a href=' + hrefs[index] + ' target="_self" class="top-link">' + name + '</a>';

    console.log('$nestedLi', $nestedLi);

    $nestedLi.append($nestedLink);
    $nestedLi.append($submenuNav);
  }

  $('.has-carret').on('click', function () {
    var $target = $(this).data('link');

    makeBreadcrumbs($target);
  });

  /**
   * SLICK INIT
   */

  $('.testimonials-container').slick({
    autoplay: true,
    dots: true,
    infinite: true,
    speed: 1000,
    slidesToShow: 1,
    adaptiveHeight: true,
  });

  $('.noteworthy-container').slick({
    arrows: true,
    dots: false,
    infinite: true,
    slidesToShow: 3,
    slidesToScroll: 1,
    adaptiveHeight: true,
    prevArrow: '<button type="button" class="slick-prev arrow-prev">Previous</button>',
    nextArrow: '<button type="button" class="slick-next arrow-next">Next</button>',
    appendArrows: $('.arrows'),
    responsive: [
      {
        breakpoint: 992,
        settings: {
          slidesToShow: 2,
          adaptiveHeight: true,
        },
      },
      {
        breakpoint: 568,
        settings: {
          slidesToShow: 2,
          adaptiveHeight: true,
          variableWidth: true,
        },
      },
    ],
  });

  var isIE11 = /Trident.*rv[ :]*11\./.test(navigator.userAgent);

  $('.noteworthy-container.slick-initialized').find('.slick-list').addClass('ie11-transform-fix');

  var logosSlickSettings = {
    arrows: true,
    dots: false,
    infinite: true,
    slidesToShow: 3,
    slidesToScroll: 3,
    adaptiveHeight: true,
    prevArrow: false,
    nextArrow: '<button type="button" class="slick-next arrow-next">Next</button>',
    appendArrows: $('.logos-arrows'),
    responsive: [
      {
        breakpoint: 768,
        settings: {
          slidesToShow: 4,
          variableWidth: true,
        },
      },
      {
        breakpoint: 900,
        settings: {
          slidesToShow: 5,
          variableWidth: false,
        },
      },
      {
        breakpoint: 1200,
        settings: 'unslick',
      },
    ],
    mobileFirst: true,
  };

  $(window)
    .on('resize', function () {
      if ($(window).outerWidth() < 1200) {
        $('.logos-list').slick(logosSlickSettings);
      }
    })
    .trigger('resize');

  /**
   * SR INIT
   */

  window.sr = ScrollReveal({
    duration: 600,
    delay: 0,
    distance: '40px',
    viewFactor: 0.8,
    scale: 1,
    easing: 'ease-out',
  });

  sr.reveal('.cta-block-description, .cta-block .btn');

  sr.reveal('h1, h2', {
    duration: 600,
    delay: 0,
    distance: '40px',
    viewFactor: 0.5,
    scale: 1,
    easing: 'ease-out',
  });

  sr.reveal('.hero-copy > p', {
    duration: 800,
    delay: 0,
    distance: '40px',
    viewFactor: 0.5,
    scale: 1,
    easing: 'ease-out',
  });

  sr.reveal('.callout p, .about-telos p', {
    duration: 900,
    delay: 0,
    distance: '30px',
    viewFactor: 0.1,
    scale: 1,
    easing: 'ease-out',
  });

  sr.reveal('.callout-img-wrap.right img', {
    duration: 600,
    delay: 0,
    origin: 'right',
    distance: '40px',
    viewFactor: 0.65,
    scale: 1,
    easing: 'ease-out',
  });

  sr.reveal('.callout-img-wrap.left img', {
    duration: 500,
    delay: 0,
    origin: 'left',
    distance: '60px',
    viewFactor: 0.65,
    scale: 1,
    easing: 'ease-out',
  });

  if ($(window).outerWidth() > 768) {
    sr.reveal(
      '.logo',
      {
        duration: 2200,
      },
      50,
    );
  }

  /**
   * ma5menu INIT
   */
  ma5menu({
    position: 'right',
    closeOnBodyClick: true,
  });

  /**
   * Desktop Nav INIT
   */

  $(document).on('mouseenter mouseleave', '.top-link', function (e) {
    var $nav = $(this).next();
    $nav.fadeIn();

    $(this).toggleClass('active');

    // $('.top-link').each(function(el, $link) {
    // 	$($link).removeClass('is-open');
    // 	$($self).find('.top-link').addClass('is-open');
    // });

    console.log($(e.target));
    if ($(e.target).hasClass('breadcrumb-top-link')) {
      $('.breadcrumb-nested-nav').each(function (el, $nav) {
        $($nav).removeClass('is-open');
      });
    } else {
      $('.nested-nav').each(function (el, $nav) {
        $($nav).removeClass('is-open');
      });
    }

    $nav.toggleClass('is-open');
    $nav.children('li').addClass('js-pointer-events');
  });

  $(document).on('click', function (e) {
    if ($(e.target).hasClass('js-hover')) {
      return false;
    } else {
      $('.nested-nav').removeClass('is-open');
      $('.breadcrumb-nav').addClass('js-close');
    }
  });
});
