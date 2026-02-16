/**
 * خيارات العقارات - فيلا وشقة
 * Property options for Villa and Apartment
 */

export const ROOM_COUNT_OPTIONS = [
  { value: 'studio', ar: 'ستوديو', en: 'Studio' },
  { value: '1', ar: '1', en: '1' },
  { value: '2', ar: '2', en: '2' },
  { value: '3', ar: '3', en: '3' },
  { value: '4', ar: '4', en: '4' },
  { value: '5', ar: '5', en: '5' },
  { value: '6+', ar: '6+', en: '6+' },
];

export const BATHROOM_COUNT_OPTIONS = [
  { value: '1', ar: '1', en: '1' },
  { value: '2', ar: '2', en: '2' },
  { value: '3', ar: '3', en: '3' },
  { value: '4', ar: '4', en: '4' },
  { value: '5', ar: '5', en: '5' },
  { value: '6+', ar: '6+', en: '6+' },
];

export const FURNISHED_OPTIONS = [
  { value: 'furnished', ar: 'مفروشة', en: 'Furnished' },
  { value: 'unfurnished', ar: 'غير مفروشة', en: 'Unfurnished' },
  { value: 'partial', ar: 'مفروش جزئياً', en: 'Partially Furnished' },
];

export const FLOOR_COUNT_OPTIONS = [
  { value: '1', ar: 'طابق واحد', en: 'One Floor' },
  { value: '2', ar: 'طابقين', en: 'Two Floors' },
  { value: '3', ar: 'ثلاث طوابق', en: 'Three Floors' },
  { value: '4', ar: 'اربع طوابق', en: 'Four Floors' },
  { value: '5+', ar: 'خمس طوابق وأكثر', en: 'Five Floors or More' },
];

export const BUILDING_AGE_OPTIONS = [
  { value: 'under_construction', ar: 'قيد الإنشاء', en: 'Under Construction' },
  { value: '0_11_months', ar: '0 - 11 شهر', en: '0 - 11 Months' },
  { value: '1_5_years', ar: '1 - 5 سنوات', en: '1 - 5 Years' },
  { value: '6_9_years', ar: '6 - 9 سنوات', en: '6 - 9 Years' },
  { value: '10_19_years', ar: '10 - 19 سنوات', en: '10 - 19 Years' },
  { value: '20_plus', ar: '20+ سنة', en: '20+ Years' },
];

export const ADVERTISER_OPTIONS = [
  { value: 'owner', ar: 'المالك', en: 'Owner' },
  { value: 'broker', ar: 'الوسيط', en: 'Broker' },
];

export const MAIN_FEATURES = [
  { key: 'central_ac', ar: 'تكييف مركزي', en: 'Central AC' },
  { key: 'ac', ar: 'مكيف', en: 'AC' },
  { key: 'heating', ar: 'تدفئة', en: 'Heating' },
  { key: 'balcony', ar: 'شرفة / بلكونة', en: 'Balcony' },
  { key: 'maid_room', ar: 'غرفة خادمة', en: 'Maid Room' },
  { key: 'laundry_room', ar: 'غرفة غسيل', en: 'Laundry Room' },
  { key: 'built_in_wardrobes', ar: 'خزائن حائط', en: 'Built-in Wardrobes' },
  { key: 'private_pool', ar: 'مسبح خاص', en: 'Private Pool' },
  { key: 'solar_heater', ar: 'سخان شمسي', en: 'Solar Heater' },
  { key: 'double_glazing', ar: 'زجاج شبابيك مزدوج', en: 'Double Glazing' },
  { key: 'jacuzzi', ar: 'جاكوزي', en: 'Jacuzzi' },
  { key: 'fitted_kitchen', ar: 'مطبخ جاهز', en: 'Fitted Kitchen' },
  { key: 'electric_water_heater', ar: 'اباجورت كهرباء', en: 'Electric Water Heater' },
  { key: 'underfloor_heating', ar: 'تدفئة تحت البلاط', en: 'Underfloor Heating' },
  { key: 'washing_machine', ar: 'غسالة', en: 'Washing Machine' },
  { key: 'dishwasher', ar: 'جلاية صحون', en: 'Dishwasher' },
  { key: 'microwave', ar: 'مايكرويف', en: 'Microwave' },
  { key: 'oven', ar: 'فرن', en: 'Oven' },
  { key: 'fridge', ar: 'ثلاجة', en: 'Fridge' },
];

export const ADDITIONAL_FEATURES = [
  { key: 'elevator', ar: 'مصعد', en: 'Elevator' },
  { key: 'garden', ar: 'حديقة', en: 'Garden' },
  { key: 'parking', ar: 'موقف سيارات', en: 'Parking' },
  { key: 'security', ar: 'حارس / أمن وحماية', en: 'Security' },
  { key: 'stairs', ar: 'درج', en: 'Stairs' },
  { key: 'storage', ar: 'مخزن', en: 'Storage' },
  { key: 'bbq_area', ar: 'منطقة شواء', en: 'BBQ Area' },
  { key: 'backup_power', ar: 'نظام كهرباء احتياطي للطوارئ', en: 'Backup Power' },
  { key: 'swimming_pool', ar: 'بركة سباحة', en: 'Swimming Pool' },
  { key: 'intercom', ar: 'انتركم', en: 'Intercom' },
  { key: 'internet', ar: 'انترنت', en: 'Internet' },
  { key: 'disability_friendly', ar: 'تسهيلات لأصحاب الهمم', en: 'Disability Friendly' },
];

export const NEARBY_LOCATIONS = [
  { key: 'bank_atm', ar: 'بنك / صراف الآلي', en: 'Bank / ATM' },
  { key: 'dry_cleaner', ar: 'دراي كلين', en: 'Dry Cleaner' },
  { key: 'supermarket', ar: 'سوبر ماركت', en: 'Supermarket' },
  { key: 'gym', ar: 'صالة رياضية / جيم', en: 'Gym' },
  { key: 'pharmacy', ar: 'صيدلية', en: 'Pharmacy' },
  { key: 'bus_station', ar: 'محطة باصات', en: 'Bus Station' },
  { key: 'school', ar: 'مدرسة', en: 'School' },
  { key: 'hospital', ar: 'مستشفى', en: 'Hospital' },
  { key: 'mosque', ar: 'مسجد', en: 'Mosque' },
  { key: 'restaurant', ar: 'مطعم', en: 'Restaurant' },
  { key: 'parking_nearby', ar: 'موقف سيارات', en: 'Parking' },
  { key: 'mall', ar: 'مول / مركز تسوق', en: 'Mall' },
];

export const FACING_OPTIONS = [
  { value: 'north', ar: 'شمالية', en: 'North' },
  { value: 'south', ar: 'جنوبية', en: 'South' },
  { value: 'east', ar: 'شرقية', en: 'East' },
  { value: 'west', ar: 'غربية', en: 'West' },
  { value: 'north_east', ar: 'شمالية شرقية', en: 'North East' },
  { value: 'north_west', ar: 'شمالية غربية', en: 'North West' },
  { value: 'south_east', ar: 'جنوبية شرقية', en: 'South East' },
  { value: 'south_west', ar: 'جنوبية غربية', en: 'South West' },
];
