from django.core.management.base import BaseCommand

from monitor.models import Device


class Command(BaseCommand):
    help = "장치를 등록하거나 정보를 갱신합니다. (미등록 장치의 업로드는 거부됩니다)"

    def add_arguments(self, parser):
        parser.add_argument("--device-id", default="iceguard-01")
        parser.add_argument("--name", default="정문 오르막")
        parser.add_argument("--lat", type=float, default=0.0)
        parser.add_argument("--lng", type=float, default=0.0)

    def handle(self, *args, **options):
        device, created = Device.objects.update_or_create(
            device_id=options["device_id"],
            defaults={"name": options["name"], "lat": options["lat"], "lng": options["lng"]},
        )
        action = "등록" if created else "갱신"
        self.stdout.write(self.style.SUCCESS(f"장치 {action}: {device}"))
