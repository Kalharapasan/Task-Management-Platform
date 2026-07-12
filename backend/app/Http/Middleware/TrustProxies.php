<?php

namespace App\Http\Middleware;

use Illuminate\Http\Middleware\TrustProxies as Middleware;
use Illuminate\Http\Request;

/**
 * TrustProxies
 *
 * Critical for correct IP address logging in audit trails.
 * When the API is behind a load balancer or reverse proxy (nginx, AWS ELB),
 * the real client IP is in the X-Forwarded-For header, not REMOTE_ADDR.
 *
 * AML audit logs must capture the REAL client IP for:
 *   - Geolocation anomaly detection (login from unusual country)
 *   - Regulatory reporting of suspicious access patterns
 *   - Law enforcement cooperation (IP attribution)
 *
 * In production, set $proxies to your specific load balancer IPs:
 *   protected $proxies = ['10.0.0.0/8', '172.16.0.0/12'];
 */
class TrustProxies extends Middleware
{
    /**
     * The trusted proxies for this application.
     * '*' trusts all proxies — restrict to specific IPs in production.
     *
     * @var array<int, string>|string|null
     */
    protected $proxies = '*';

    /**
     * The headers that should be used to detect proxies.
     * HEADER_X_FORWARDED_FOR is the standard forwarded IP header.
     *
     * @var int
     */
    protected $headers =
        Request::HEADER_X_FORWARDED_FOR |
        Request::HEADER_X_FORWARDED_HOST |
        Request::HEADER_X_FORWARDED_PORT |
        Request::HEADER_X_FORWARDED_PROTO |
        Request::HEADER_X_FORWARDED_AWS_ELB;
}
