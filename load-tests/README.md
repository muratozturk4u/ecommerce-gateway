# k6 Yuk Testleri

## On Kosullar

1. k6 kurulu olmali:
   ```bash
   # Ubuntu/Debian
   sudo gpg -k
   sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D68
   echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
   sudo apt-get update && sudo apt-get install k6

   # macOS
   brew install k6

   # Windows
   winget install k6
   ```

2. Docker container'lar ayakta olmali:
   ```bash
   docker-compose up -d --build
   ```

3. Seed verisi yuklu olmali:
   ```bash
   docker compose --profile seed up seed
   ```

4. Sistem saglikli olmali:
   ```bash
   curl http://localhost:3000/health
   ```

## Testleri Calistirma

### Smoke Test (hizli dogrulama)
```bash
k6 run load-tests/smoke.js
```

### Load Test (normal yuk)
```bash
k6 run load-tests/load.js
```

### Stress Test (agir yuk, ramp-up)
```bash
k6 run load-tests/stress.js
```

### Routing Accuracy (tum endpoint'lerin dogruligi)
```bash
k6 run load-tests/routing-accuracy.js
```

### Farkli BASE_URL ile calistirma
```bash
k6 run -e BASE_URL=http://192.168.1.100:3000 load-tests/smoke.js
```

### Sonuclari JSON'a kaydetme
```bash
mkdir -p load-tests/results
k6 run --out json=load-tests/results/smoke.json load-tests/smoke.js
k6 run --out json=load-tests/results/load.json load-tests/load.js
k6 run --out json=load-tests/results/stress.json load-tests/stress.js
k6 run --out json=load-tests/results/routing.json load-tests/routing-accuracy.js
```

## Threshold Tablosu

| Test | VU | Sure | p(95) | Hata Orani |
|------|----|------|-------|------------|
| Smoke | 5 | 30s | < 500ms | < 1% |
| Load | 50 | 1m | < 1000ms | < 5% |
| Stress | 50-500 | 4.5m | < 3000ms | < 15% |
| Routing | 1 | - | - | 0% (checks=100%) |

## Grafana'da Izleme

k6 testleri calisirken Grafana'da canli veri gorebilirsiniz:

1. http://localhost:3100 adresine gidin (admin/admin)
2. Dashboards > E-Commerce Gateway > Load Test Results
3. Stress testi sirasinda ramp-up grafiklerini goruntuleyin
4. Screenshot almak icin test calisirken 30 saniye bekleyin
