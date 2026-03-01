Pod::Spec.new do |s|
  s.name           = 'CoremlDetectionModule'
  s.version        = '1.0.0'
  s.summary        = 'Core ML / Vision object detection for ShelterScan'
  s.description    = 'Runs Vision framework on iOS for on-device image classification.'
  s.author         = 'Haven'
  s.homepage       = 'https://github.com/your-repo/haven'
  s.platforms      = { :ios => '15.1' }
  s.source         = { git: 'https://github.com/your-repo/haven.git' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.source_files   = '**/*.{h,m,mm,swift}'
end
